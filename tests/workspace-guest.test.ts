import test from 'node:test';
import assert from 'node:assert/strict';
import { getWorkspace } from '../lib/workspace';
import { EMPTY_PROFILE } from '../lib/demo';

const settings = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] as const;

test('missing, partial, or blank authentication configuration opens an empty guest workspace without a network request', async (t) => {
  const previous = settings.map((name) => process.env[name]);
  t.after(() => settings.forEach((name, index) => {
    if (previous[index] === undefined) delete process.env[name]; else process.env[name] = previous[index];
  }));
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Guest loading must not request account data.'); });
  const configurations: Partial<Record<typeof settings[number], string>>[] = [
    {},
    { NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co' },
    { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-test-key' },
    { NEXT_PUBLIC_SUPABASE_URL: ' \n ', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ' \t ' },
  ];
  for (const configuration of configurations) {
    settings.forEach((name) => {
      const value = configuration[name];
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    });
    const workspace = await getWorkspace();
    assert.deepEqual(workspace, {
      profile: EMPTY_PROFILE, isDemo: true, isGuest: true,
      authConfigured: false, userId: null, userEmail: null, hasSavedProfile: false,
    });
    // Each guest gets independent arrays, with no sample person or stale user data.
    workspace.profile.fullName = 'Local draft';
    workspace.profile.skills.push('TypeScript');
    assert.deepEqual((await getWorkspace()).profile, EMPTY_PROFILE);
    assert.equal(EMPTY_PROFILE.fullName, '');
    assert.deepEqual(EMPTY_PROFILE.skills, []);
  }
  assert.equal(fetch.mock.callCount(), 0);
});
