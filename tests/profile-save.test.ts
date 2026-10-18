import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_PROFILE } from '../lib/demo';
import { saveProfileForAccount, type ProfileSaveStore } from '../lib/profile-save';
import type { UserProfile } from '../types';

const accountA = '11111111-1111-4111-8111-111111111111';
const accountB = '22222222-2222-4222-8222-222222222222';
const profile: UserProfile = { ...structuredClone(EMPTY_PROFILE), fullName: 'Taylor Morgan', title: 'Engineer' };

test('an editor from another account or an expired session cannot overwrite any account profile', async () => {
  const records = new Map([[accountA, profile], [accountB, { ...profile, fullName: 'Account B' }]]);
  let writes = 0;
  const store: ProfileSaveStore = {
    async write(userId, value) { writes += 1; records.set(userId, value); return { error: null }; },
  };
  for (const [expected, verified] of [[accountA, accountB], [accountA, null], [null, accountB], [undefined, accountB]] as const) {
    const result = await saveProfileForAccount({ ...profile, fullName: 'Unsaved edit in account A' }, expected, verified, store);
    assert.equal(result.ok, false);
    assert.match(result.error ?? '', /account changed or your session expired/);
  }
  assert.equal(writes, 0);
  assert.equal(records.get(accountA)?.fullName, 'Taylor Morgan');
  assert.equal(records.get(accountB)?.fullName, 'Account B');
});

test('a matching verified account saves validated data only to its own profile', async () => {
  const writes: Array<{ userId: string; profile: UserProfile }> = [];
  const result = await saveProfileForAccount({ ...profile, fullName: ' Taylor Morgan ' }, accountA, accountA, {
    async write(userId, value) { writes.push({ userId, profile: value }); return { error: null }; },
  });
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(writes, [{ userId: accountA, profile }]);
});

test('invalid profile content is rejected before a matched account is written', async () => {
  let writes = 0;
  const result = await saveProfileForAccount({ ...profile, website: 'javascript:alert(1)' }, accountA, accountA, {
    async write() { writes += 1; return { error: null }; },
  });
  assert.equal(result.ok, false);
  assert.equal(writes, 0);
});

test('failed account writes return safe errors without claiming success', async () => {
  for (const store of [
    { async write() { return { error: new Error('private database detail') }; } },
    { async write() { throw new Error('private database detail'); } },
  ]) {
    const result = await saveProfileForAccount(profile, accountA, accountA, store);
    assert.equal(result.ok, false);
    assert.ok(result.error);
    assert.ok(!result.error.includes('private database detail'));
  }
});
