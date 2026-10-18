import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAppOrigin, type AppOriginInput } from '../lib/env/app-origin';
import { getAuthCallbackUrl, getServerAppOrigin } from '../lib/env/server';
import { validateProductionEnvironment } from '../lib/env/production';
import { assertSameOrigin } from '../lib/http';

const canonical = 'https://resume-architect-seven.vercel.app';
const origins: AppOriginInput = {
  NEXT_PUBLIC_APP_URL: canonical,
  VERCEL_ENV: 'production',
  VERCEL_PROJECT_PRODUCTION_URL: 'stable.example.com',
  VERCEL_URL: 'deployment-project.vercel.app',
};

function withEnvironment(values: Record<string, string | undefined>, run: () => void) {
  const settings = {
    NEXT_PUBLIC_APP_URL: undefined, VERCEL_ENV: undefined, VERCEL_URL: undefined,
    VERCEL_PROJECT_PRODUCTION_URL: undefined, NODE_ENV: 'production', ...values,
  };
  const previous = Object.fromEntries(Object.keys(settings).map(name => [name, process.env[name]]));
  for (const [name, value] of Object.entries(settings)) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
  try { run(); }
  finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
}

test('explicit application origin wins over every Vercel fallback and has no trailing slash', () => {
  for (const environment of ['production', 'preview']) {
    assert.equal(resolveAppOrigin({ ...origins, VERCEL_ENV: environment, NEXT_PUBLIC_APP_URL: ` ${canonical}/ ` }), canonical);
  }
  withEnvironment({ ...origins }, () => {
    assert.equal(getServerAppOrigin(), canonical);
    assert.equal(getAuthCallbackUrl(), `${canonical}/auth/callback`);
  });
});

test('production fallbacks prefer the stable domain and add HTTPS exactly once', () => {
  assert.equal(resolveAppOrigin({ ...origins, NEXT_PUBLIC_APP_URL: '' }), 'https://stable.example.com');
  assert.equal(resolveAppOrigin({ ...origins, NEXT_PUBLIC_APP_URL: undefined, VERCEL_PROJECT_PRODUCTION_URL: ' https://stable.example.com/ ' }), 'https://stable.example.com');
  assert.equal(resolveAppOrigin({ ...origins, NEXT_PUBLIC_APP_URL: ' ', VERCEL_PROJECT_PRODUCTION_URL: '' }), 'https://deployment-project.vercel.app');
});

test('previews use their deployment hostname and never fall back to the production host', () => {
  assert.equal(resolveAppOrigin({ ...origins, NEXT_PUBLIC_APP_URL: undefined, VERCEL_ENV: 'preview' }), 'https://deployment-project.vercel.app');
  assert.equal(resolveAppOrigin({ ...origins, NEXT_PUBLIC_APP_URL: undefined, VERCEL_ENV: 'preview', VERCEL_URL: undefined }), undefined);
});

test('local callback fallback is limited to development with no deployment environment', () => {
  withEnvironment({ NODE_ENV: 'development' }, () => {
    assert.equal(getServerAppOrigin(), undefined);
    assert.equal(getAuthCallbackUrl(), 'http://127.0.0.1:3000/auth/callback');
  });
  for (const settings of [{ NODE_ENV: 'production' }, { NODE_ENV: 'development', VERCEL_ENV: 'preview' }]) {
    withEnvironment(settings, () => assert.throws(() => getAuthCallbackUrl(), /NEXT_PUBLIC_APP_URL/));
  }
});

test('invalid explicit origins fail instead of silently falling back', () => {
  for (const invalid of ['https://resume.example/auth', 'https://resume.example?next=evil', '"https://resume.example"', 'https://resume.example\\n']) {
    assert.throws(() => resolveAppOrigin({ ...origins, NEXT_PUBLIC_APP_URL: invalid }), /NEXT_PUBLIC_APP_URL/);
  }
});

test('Vercel fallbacks reject paths, credentials, control characters and non-HTTPS hosts', () => {
  for (const invalid of ['http://localhost:3000', 'http://deployment.vercel.app', 'deployment.vercel.app/path', 'deployment.vercel.app?x=y', 'user:password@deployment.vercel.app', 'deploy\nment.vercel.app', 'deployment.vercel.app\\n', '//deployment.vercel.app']) {
    assert.throws(() => resolveAppOrigin({ VERCEL_ENV: 'preview', VERCEL_URL: invalid }), /VERCEL_URL/);
  }
});

test('callback construction and API origin checks agree on the Vercel fallback', () => {
  withEnvironment({ VERCEL_ENV: 'preview', VERCEL_URL: 'preview-project.vercel.app' }, () => {
    const expected = 'https://preview-project.vercel.app';
    assert.equal(getAuthCallbackUrl(), `${expected}/auth/callback`);
    assert.doesNotThrow(() => assertSameOrigin(new Request('http://internal:3000/api/tailor', { headers: { Origin: expected } })));
    assert.throws(() => assertSameOrigin(new Request('http://internal:3000/api/tailor', {
      headers: { Origin: 'https://attacker.example', Host: 'attacker.example', 'X-Forwarded-Host': 'attacker.example' },
    })));
  });
});

test('production validation accepts a valid Vercel fallback and still requires the other services', () => {
  const configuration = {
    VERCEL_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: 'resume-architect-seven.vercel.app',
    NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-test-key',
    GEMINI_API_KEY: 'private-test-key',
  };
  assert.doesNotThrow(() => validateProductionEnvironment(configuration));
  assert.throws(() => validateProductionEnvironment({ ...configuration, GEMINI_API_KEY: '' }), /GEMINI_API_KEY/);
});
