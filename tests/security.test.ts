import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveJobProvider, htmlToText, extractJobDescription } from '../lib/jobs';
import { assertSameOrigin, readJson } from '../lib/http';
import { profileSchema, tailorRequestSchema } from '../lib/schemas';
import { DEMO_PROFILE } from '../lib/demo';
import { hasSupabaseConfig, supabaseConfig } from '../lib/supabase/config';

function withEnvironment(values: Record<string, string | undefined>, callback: () => void) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  try { callback(); }
  finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}

test('job URL parser cannot address private networks or arbitrary hosts', () => {
  for (const url of [
    'http://127.0.0.1/admin', 'https://169.254.169.254/latest/meta-data', 'https://localhost/jobs',
    'https://boards.greenhouse.io.evil.com/acme/jobs/1', 'https://boards.greenhouse.io@evil.com/acme/jobs/1',
    'https://boards.greenhouse.io:8443/acme/jobs/1', 'https://boards.greenhouse.io/%2e%2e/jobs/1',
    'https://boards.greenhouse.io/acme/jobs/1/../../private', 'https://example.com/job',
  ]) assert.throws(() => resolveJobProvider(url), { name: 'Error' });
});

test('only recognized posting paths produce fixed provider endpoints', () => {
  assert.equal(resolveJobProvider('https://job-boards.greenhouse.io/acme/jobs/123?utm_source=web').apiUrl, 'https://boards-api.greenhouse.io/v1/boards/acme/jobs/123');
  assert.equal(resolveJobProvider('https://jobs.eu.lever.co/acme/12345678-1234-1234-1234-123456789abc').apiUrl, 'https://api.eu.lever.co/v0/postings/acme/12345678-1234-1234-1234-123456789abc?mode=json');
});

test('HTML extraction handles Greenhouse encoded markup and strips scripts', () => {
  assert.equal(htmlToText('&lt;p&gt;React &amp;amp; TypeScript&lt;/p&gt;<script>alert(1)</script>'), 'React & TypeScript');
});

test('provider redirects are refused instead of followed into private networks', async () => {
  const originalFetch = globalThis.fetch;
  let called = 0;
  globalThis.fetch = async (input, init) => {
    called += 1;
    assert.equal(input, 'https://boards-api.greenhouse.io/v1/boards/acme/jobs/123');
    assert.equal(init?.redirect, 'manual');
    return new Response(null, { status: 302, headers: { Location: 'http://169.254.169.254' } });
  };
  try {
    await assert.rejects(extractJobDescription('https://boards.greenhouse.io/acme/jobs/123'), /could not be imported/);
    assert.equal(called, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test('Greenhouse import returns bounded plain job text from its fixed public API', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ title: 'Senior Frontend Engineer', content: '<p>Build accessible React and TypeScript applications with a collaborative product engineering team.</p>' });
  try {
    const description = await extractJobDescription('https://boards.greenhouse.io/acme/jobs/123');
    assert.ok(description.includes('Senior Frontend Engineer'));
    assert.ok(description.includes('React and TypeScript'));
    assert.ok(!description.includes('<p>'));
  } finally { globalThis.fetch = originalFetch; }
});

test('requests require exact same origin', () => {
  const before = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = 'https://resume.example';
  try {
    assert.doesNotThrow(() => assertSameOrigin(new Request('https://resume.example/api/tailor', { headers: { Origin: 'https://resume.example' } })));
    assert.throws(() => assertSameOrigin(new Request('https://resume.example/api/tailor', { headers: { Origin: 'https://evil.example' } })));
    assert.throws(() => assertSameOrigin(new Request('https://resume.example/api/tailor')));
  } finally { if (before === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = before; }
});

test('unconfigured development allows loopback aliases only on the same protocol and port', () => {
  withEnvironment({ NODE_ENV: 'development', NEXT_PUBLIC_APP_URL: undefined }, () => {
    const request = (origin: string) => new Request('http://localhost:3000/api/jobs/extract', { headers: { Origin: origin } });
    assert.doesNotThrow(() => assertSameOrigin(request('http://127.0.0.1:3000')));
    assert.doesNotThrow(() => assertSameOrigin(request('http://[::1]:3000')));
    for (const origin of ['http://127.0.0.1:3001', 'https://127.0.0.1:3000', 'http://evil.example:3000', 'http://localhost.evil.example:3000', 'http://127.0.0.1:3000/path']) {
      assert.throws(() => assertSameOrigin(request(origin)));
    }
  });
});

test('production and explicitly configured development origins do not permit loopback aliases', () => {
  const request = new Request('http://localhost:3000/api/jobs/extract', { headers: { Origin: 'http://127.0.0.1:3000' } });
  withEnvironment({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: undefined }, () => assert.throws(() => assertSameOrigin(request)));
  withEnvironment({ NODE_ENV: 'development', NEXT_PUBLIC_APP_URL: 'http://localhost:3000' }, () => assert.throws(() => assertSameOrigin(request)));
});

test('Supabase accepts both current publishable and legacy public anon keys consistently', () => {
  withEnvironment({ NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }, () => {
    assert.equal(hasSupabaseConfig(), true);
    assert.equal(supabaseConfig().key, 'sb_publishable_test');
  });
  withEnvironment({ NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'legacy-public-key', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined }, () => {
    assert.equal(hasSupabaseConfig(), true);
    assert.equal(supabaseConfig().key, 'legacy-public-key');
  });
  withEnvironment({ NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined }, () => {
    assert.equal(hasSupabaseConfig(), false);
    assert.throws(() => supabaseConfig());
  });
});

test('streamed body limits hold even without a Content-Length header', async () => {
  await assert.rejects(readJson(new Request('https://resume.example/api/tailor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(1000) }) }), 100), /too large/);
  await assert.rejects(readJson(new Request('https://resume.example/api/tailor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' })), /valid JSON/);
});

test('schema accepts legitimate drafts and rejects malicious URLs, duplicate IDs and oversized inputs', () => {
  assert.ok(profileSchema.safeParse(DEMO_PROFILE).success);
  assert.ok(!profileSchema.safeParse({ ...DEMO_PROFILE, website: 'javascript:alert(1)' }).success);
  assert.ok(!profileSchema.safeParse({ ...DEMO_PROFILE, experience: [DEMO_PROFILE.experience[0], DEMO_PROFILE.experience[0]] }).success);
  assert.ok(!tailorRequestSchema.safeParse({ profile: DEMO_PROFILE, jobDescription: 'a'.repeat(24001) }).success);
});
