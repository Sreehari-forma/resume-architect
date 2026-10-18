import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { validateProductionEnvironment, type ProductionEnvironmentInput } from '../lib/env/production';
import { getAppOrigin, getSupabaseEnvironment } from '../lib/env/public';
import { getGeminiEnvironment, requireGeminiEnvironment } from '../lib/env/server';
import { EnvironmentError, parseAppOrigin, parseEnvironmentUrl } from '../lib/env/validation';
import { assertSameOrigin, errorResponse, HttpError } from '../lib/http';

const production: ProductionEnvironmentInput = {
  NEXT_PUBLIC_APP_URL: 'https://resume.example',
  NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-test-key',
  GEMINI_API_KEY: 'private-test-key',
};

function withEnvironment(values: Record<string, string | undefined>, run: () => void) {
  const previous = Object.fromEntries(Object.keys(values).map((name) => [name, process.env[name]]));
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
  try { run(); }
  finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
}

test('production validation requires the application URL, Supabase configuration and Gemini key', () => {
  assert.doesNotThrow(() => validateProductionEnvironment(production));
  for (const key of ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'GEMINI_API_KEY'] as const) {
    for (const missing of [undefined, '', ' \t ']) {
      assert.throws(() => validateProductionEnvironment({ ...production, [key]: missing }), (error: unknown) =>
        error instanceof EnvironmentError && error.message.includes(key) && !error.message.includes('private-test-key'));
    }
  }
});

test('production accepts a publishable Supabase key as the public-key alternative', () => {
  assert.doesNotThrow(() => validateProductionEnvironment({ ...production, NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ' public-publishable-test ' }));
  assert.doesNotThrow(() => validateProductionEnvironment({ ...production, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ' ' }));
});

test('production rejects loopback callback and Supabase hosts even when they use HTTPS', () => {
  const origins = ['http://localhost:3000', 'http://127.0.0.1:54321', 'https://localhost', 'https://localhost.', 'https://app.localhost', 'https://127.0.0.1', 'https://127.0.0.2', 'https://[::1]', 'https://[::ffff:127.0.0.1]'];
  for (const key of ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SUPABASE_URL'] as const) {
    for (const origin of origins) {
      assert.throws(() => validateProductionEnvironment({ ...production, [key]: origin }), (error: unknown) =>
        error instanceof EnvironmentError && error.message.includes(key) && error.message.includes('non-loopback production host'));
    }
  }
});

test('public URLs normalize safely and allow HTTP only for known loopback hosts', () => {
  assert.equal(parseAppOrigin(' HTTPS://Resume.Example:443/ '), 'https://resume.example');
  assert.equal(parseEnvironmentUrl(' https://project.supabase.co/ ', 'NEXT_PUBLIC_SUPABASE_URL'), 'https://project.supabase.co');
  for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000']) assert.equal(parseAppOrigin(origin), origin);
  for (const invalid of ['ftp://localhost:3000', 'javascript:alert(1)', 'http://resume.example', 'https://user:private-test-key@resume.example', 'not-a-url']) {
    for (const key of ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SUPABASE_URL']) {
      assert.throws(() => parseEnvironmentUrl(invalid, key, key === 'NEXT_PUBLIC_APP_URL'), (error: unknown) =>
        error instanceof EnvironmentError && error.message.includes(key) && !error.message.includes(invalid) && !error.message.includes('private-test-key'));
    }
  }
});

test('APP_URL must be an origin, including rejecting empty query and fragment delimiters', () => {
  for (const suffix of ['/studio', '/auth/callback', '?source=test', '#anchor', '?', '#']) {
    assert.throws(() => parseAppOrigin(`https://resume.example${suffix}`), /NEXT_PUBLIC_APP_URL.*origin/);
    assert.throws(() => validateProductionEnvironment({ ...production, NEXT_PUBLIC_APP_URL: `https://resume.example${suffix}` }), /NEXT_PUBLIC_APP_URL/);
  }
});

test('runtime same-origin checks use the normalized APP_URL parser and expose sanitized setup errors', () => {
  const request = new Request('https://internal.example/api/tailor', { headers: { Origin: 'https://resume.example' } });
  withEnvironment({ NEXT_PUBLIC_APP_URL: ' https://resume.example/ ' }, () => {
    assert.equal(getAppOrigin(), 'https://resume.example');
    assert.doesNotThrow(() => assertSameOrigin(request));
  });
  for (const invalid of ['ftp://localhost:3000', 'https://resume.example/studio']) {
    withEnvironment({ NEXT_PUBLIC_APP_URL: invalid }, () => {
      assert.throws(() => assertSameOrigin(request), (error: unknown) => error instanceof HttpError && error.status === 503 && error.message.includes('NEXT_PUBLIC_APP_URL') && !error.message.includes(invalid));
    });
  }
});

test('public runtime configuration exposes no Gemini credential and server configuration trims it', () => {
  withEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: ' https://project.supabase.co/ ',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ' public-test-key ',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
    GEMINI_API_KEY: ' private-test-key ', GEMINI_MODEL: ' model-override ',
  }, () => {
    const publicConfiguration = getSupabaseEnvironment();
    assert.deepEqual(publicConfiguration, { url: 'https://project.supabase.co', key: 'public-test-key' });
    assert.ok(!JSON.stringify(publicConfiguration).includes('private-test-key'));
    assert.deepEqual(requireGeminiEnvironment(), { apiKey: 'private-test-key', model: 'model-override' });
  });
  withEnvironment({ GEMINI_API_KEY: ' ', GEMINI_MODEL: undefined }, () => {
    assert.equal(getGeminiEnvironment().apiKey, undefined);
    assert.throws(() => requireGeminiEnvironment(), /GEMINI_API_KEY/);
  });
});

test('environment API errors contain configuration names without credential values', async () => {
  let caught: unknown;
  try { validateProductionEnvironment({ ...production, NEXT_PUBLIC_APP_URL: 'https://user:private-test-key@resume.example' }); }
  catch (error) { caught = error; }
  const response = errorResponse(caught);
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.ok(body.includes('NEXT_PUBLIC_APP_URL'));
  assert.ok(!body.includes('private-test-key'));
});

test('build validation imports outside the React server runtime; Gemini secrets do not', () => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '-e',
    'const { validateProductionEnvironment } = require("./lib/env/production.ts"); try { validateProductionEnvironment({}); } catch (error) { if (!error.message.includes("NEXT_PUBLIC_APP_URL")) throw error; }',
  ], { cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' } });
  assert.equal(result.status, 0, result.stderr);
  const secretImport = spawnSync(process.execPath, ['--import', 'tsx', '-e', 'require("./lib/env/server.ts")'], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' },
  });
  assert.notEqual(secretImport.status, 0);
  assert.match(secretImport.stderr, /cannot be imported from a Client Component/);
});
