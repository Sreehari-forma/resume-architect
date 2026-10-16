import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { generateTailoringPlan } from '../lib/ai/gemini';
import { assembleResume } from '../lib/ai/assemble';
import { DEMO_PROFILE } from '../lib/demo';
import { HttpError } from '../lib/http';
import type { TailoringPlan } from '../lib/schemas';

const jobDescription = 'Senior Frontend Engineer at Linear Labs. Build accessible React and TypeScript applications with a collaborative product engineering team.';
const plan: TailoringPlan = {
  jobTitle: 'Senior Frontend Engineer', company: 'Linear Labs',
  keywords: ['React', 'TypeScript'], summarySentenceIndices: [0], summaryRewrite: null,
  experience: [{ id: 'exp-1', bulletIndices: [2, 0], bulletRewrites: [] }],
  skillIndices: [1, 0], projects: [], latex: '\\input{untrusted-model-draft}',
};

function configure(t: TestContext, values: Record<string, string | undefined> = {}) {
  const settings = { GEMINI_API_KEY: ' test-gemini-key ', GEMINI_MODEL: undefined, ...values };
  for (const [name, value] of Object.entries(settings)) {
    const previous = process.env[name];
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
    t.after(() => { if (previous === undefined) delete process.env[name]; else process.env[name] = previous; });
  }
}

function completion(content: string | null = JSON.stringify(plan), finishReason = 'stop', refusal: string | null = null) {
  return Response.json({
    id: 'gemini-test', object: 'chat.completion', created: 0, model: 'gemini-3.8-flash',
    choices: [{ index: 0, finish_reason: finishReason, message: { role: 'assistant', content, refusal } }],
  });
}

test('Gemini uses its fixed endpoint, key and strict schema; parsed results still pass source and LaTeX checks', async (t) => {
  configure(t, { OPENAI_API_KEY: 'unused-openai-key', OPENAI_BASE_URL: 'https://must-not-be-used.invalid', OPENAI_ORG_ID: 'unused-org', OPENAI_PROJECT_ID: 'unused-project' });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    calls++;
    const request = new Request(input, init);
    assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
    assert.equal(request.method, 'POST');
    assert.equal(request.headers.get('authorization'), 'Bearer test-gemini-key');
    assert.equal(request.headers.get('openai-organization'), null);
    assert.equal(request.headers.get('openai-project'), null);
    const body = await request.json();
    assert.equal(body.model, 'gemini-3.8-flash');
    assert.equal(body.response_format.type, 'json_schema');
    assert.equal(body.response_format.json_schema.name, 'resume_tailoring_plan');
    assert.equal(body.response_format.json_schema.strict, true);
    assert.ok(body.response_format.json_schema.schema.required.includes('keywords'));
    assert.ok(body.response_format.json_schema.schema.required.includes('experience'));
    assert.equal(body.messages[0].role, 'system');
    assert.equal(JSON.parse(body.messages[1].content).jobDescription, jobDescription);
    assert.deepEqual(JSON.parse(body.messages[1].content).masterProfile, DEMO_PROFILE);
    return completion();
  });
  const result = await generateTailoringPlan(DEMO_PROFILE, jobDescription);
  assert.deepEqual(result, plan);
  const resume = assembleResume(DEMO_PROFILE, jobDescription, result);
  assert.ok(resume.latex.includes('\\documentclass'));
  assert.ok(!resume.latex.includes('untrusted-model-draft'));
  assert.equal(calls, 1);
});

test('an explicit Gemini model override is trimmed and sent to Google', async (t) => {
  configure(t, { GEMINI_MODEL: ' gemini-test-model ' });
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    assert.equal((await new Request(input, init).json()).model, 'gemini-test-model');
    return completion();
  });
  assert.deepEqual(await generateTailoringPlan(DEMO_PROFILE, jobDescription), plan);
});

test('missing or blank Gemini keys give setup errors without falling back to an OpenAI key', async (t) => {
  for (const key of [undefined, '', ' \t ']) {
    await t.test(`key: ${JSON.stringify(key)}`, async (t) => {
      configure(t, { GEMINI_API_KEY: key, OPENAI_API_KEY: 'unused-openai-key' });
      const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('No provider should be contacted'); });
      await assert.rejects(generateTailoringPlan(DEMO_PROFILE, jobDescription), (error: unknown) =>
        error instanceof HttpError && error.status === 503 && error.message.includes('GEMINI_API_KEY'));
      assert.equal(fetch.mock.callCount(), 0);
    });
  }
});

test('malformed, incomplete and truncated structured responses fail closed', async (t) => {
  const responses = [
    () => completion('{invalid'),
    () => completion(JSON.stringify({ jobTitle: 'Missing fields' })),
    () => completion(JSON.stringify({ ...plan, keywords: [42] })),
    () => completion(JSON.stringify(plan), 'length'),
    () => completion(null, 'content_filter'),
  ];
  for (const [index, response] of responses.entries()) {
    await t.test(`invalid result ${index + 1}`, async (t) => {
      configure(t);
      t.mock.method(globalThis, 'fetch', async () => response());
      await assert.rejects(generateTailoringPlan(DEMO_PROFILE, jobDescription), (error: unknown) =>
        error instanceof HttpError && error.status === 502 && error.message.includes('complete valid result'));
    });
  }
});

test('model refusals and empty completions return actionable content errors', async (t) => {
  for (const response of [() => completion(null, 'stop', 'refused'), () => Response.json({ choices: [] })]) {
    await t.test('no parsed resume', async (t) => {
      configure(t);
      t.mock.method(globalThis, 'fetch', async () => response());
      await assert.rejects(generateTailoringPlan(DEMO_PROFILE, jobDescription), (error: unknown) => error instanceof HttpError && error.status === 422);
    });
  }
});

test('provider errors report safe setup/quota guidance without retrying or exposing provider details', async (t) => {
  for (const [status, expectedStatus, fragment] of [
    [429, 503, 'quota'], [401, 503, 'GEMINI_API_KEY'], [403, 503, 'GEMINI_API_KEY'],
    [404, 503, 'GEMINI_MODEL'], [500, 502, 'complete valid result'],
  ] as const) {
    await t.test(`HTTP ${status}`, async (t) => {
      configure(t);
      const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ error: { message: 'private-provider-detail', type: 'provider_error' } }, { status }));
      await assert.rejects(generateTailoringPlan(DEMO_PROFILE, jobDescription), (error: unknown) =>
        error instanceof HttpError && error.status === expectedStatus && error.message.includes(fragment) && !error.message.includes('private-provider-detail'));
      assert.equal(fetch.mock.callCount(), 1);
    });
  }
});
