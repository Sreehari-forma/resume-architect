import test from 'node:test';
import assert from 'node:assert/strict';
import { hasSupabaseConfig, supabaseConfig } from '../lib/supabase/config';

const ENV_NAMES = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;
type Configuration = Partial<Record<typeof ENV_NAMES[number], string>>;

function withConfig(values: Configuration, run: () => void) {
  const previous = ENV_NAMES.map((name) => process.env[name]);
  ENV_NAMES.forEach((name) => {
    const value = values[name];
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  });
  try { run(); }
  finally {
    ENV_NAMES.forEach((name, index) => {
      const value = previous[index];
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    });
  }
}

test('absent, partial, and whitespace-only Supabase settings retain the demo/setup path', () => {
  const incomplete: Configuration[] = [
    {},
    { NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co' },
    { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' },
    { NEXT_PUBLIC_SUPABASE_ANON_KEY: 'legacy-public-test' },
    { NEXT_PUBLIC_SUPABASE_URL: ' \n\t ', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' },
    { NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ' \t ', NEXT_PUBLIC_SUPABASE_ANON_KEY: '\n ' },
    { NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' },
  ];
  for (const config of incomplete) {
    withConfig(config, () => {
      assert.equal(hasSupabaseConfig(), false);
      assert.throws(() => supabaseConfig(), /Supabase is not configured/);
    });
  }
});

test('complete settings trim whitespace consistently before initializing a client', () => {
  withConfig({ NEXT_PUBLIC_SUPABASE_URL: ' https://project.supabase.co\n', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ' sb_publishable_test \t' }, () => {
    assert.equal(hasSupabaseConfig(), true);
    assert.deepEqual(supabaseConfig(), { url: 'https://project.supabase.co', key: 'sb_publishable_test' });
  });
});

test('a real publishable key takes precedence and a blank publishable key falls back to anon', () => {
  const base = { NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: ' legacy-public-test ' };
  withConfig({ ...base, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ' sb_publishable_test ' }, () => {
    assert.equal(hasSupabaseConfig(), true);
    assert.equal(supabaseConfig().key, 'sb_publishable_test');
  });
  withConfig({ ...base, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ' \t\n ' }, () => {
    assert.equal(hasSupabaseConfig(), true);
    assert.equal(supabaseConfig().key, 'legacy-public-test');
  });
});
