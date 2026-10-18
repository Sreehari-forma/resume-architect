import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_PROFILE } from '../lib/demo';
import { importProfileIfAbsent, type ProfileImportStore } from '../lib/profile-import';
import type { UserProfile } from '../types';

function profile(name = 'Taylor Morgan'): UserProfile {
  return { ...structuredClone(EMPTY_PROFILE), fullName: name, title: 'Product Engineer', skills: ['TypeScript'] };
}

function accountStore(initial: unknown | null = null) {
  let record = initial;
  let insertions = 0;
  const store: ProfileImportStore = {
    async insertIfAbsent(value) {
      if (record === null) { record = structuredClone(value); insertions += 1; }
      return { error: null };
    },
    async read() { return { data: record, error: null }; },
  };
  return { store, record: () => record, insertions: () => insertions };
}

test('a valid guest draft imports into an empty account and repeated imports are idempotent', async () => {
  const account = accountStore();
  const draft = profile();
  assert.deepEqual(await importProfileIfAbsent(draft, account.store), { status: 'imported' });
  assert.deepEqual(await importProfileIfAbsent(draft, account.store), { status: 'imported' });
  assert.equal(account.insertions(), 1);
  assert.deepEqual(account.record(), draft);
});

test('an existing different account profile is never overwritten, including malformed saved data', async () => {
  for (const existing of [profile('Existing account'), { unknown: 'historical account data' }]) {
    const account = accountStore(existing);
    assert.deepEqual(await importProfileIfAbsent(profile(), account.store), { status: 'existing' });
    assert.deepEqual(account.record(), existing);
    assert.equal(account.insertions(), 0);
  }
});

test('a retry compares validated content instead of JSON property insertion order', async () => {
  const draft = profile();
  const reordered = Object.fromEntries(Object.entries(draft).reverse());
  const account = accountStore(reordered);
  assert.deepEqual(await importProfileIfAbsent({ ...draft, fullName: ' Taylor Morgan ' }, account.store), { status: 'imported' });
  assert.equal(account.insertions(), 0);
});

test('strict profile validation rejects invalid drafts before any database operation', async () => {
  let calls = 0;
  const store: ProfileImportStore = {
    async insertIfAbsent() { calls += 1; return { error: null }; },
    async read() { calls += 1; return { data: null, error: null }; },
  };
  for (const invalid of [{ ...profile(), extra: 'unrecognized' }, { ...profile(), website: 'javascript:alert(1)' }, { ...profile(), skills: ['x'.repeat(81)] }]) {
    assert.equal((await importProfileIfAbsent(invalid, store)).status, 'error');
  }
  assert.equal(calls, 0);
});

test('competing imports cannot replace the first account profile', async () => {
  const account = accountStore();
  const first = profile('First tab');
  const second = profile('Second tab');
  const outcomes = await Promise.all([importProfileIfAbsent(first, account.store), importProfileIfAbsent(second, account.store)]);
  assert.deepEqual(outcomes, [{ status: 'imported' }, { status: 'existing' }]);
  assert.equal(account.insertions(), 1);
  assert.deepEqual(account.record(), first);
});

test('database failures and unverified writes return safe retry errors', async () => {
  const privateError = new Error('private database detail');
  const stores: ProfileImportStore[] = [
    { async insertIfAbsent() { return { error: privateError }; }, async read() { throw new Error('Read should not happen'); } },
    { async insertIfAbsent() { return { error: null }; }, async read() { return { data: null, error: privateError }; } },
    { async insertIfAbsent() { return { error: null }; }, async read() { return { data: null, error: null }; } },
    { async insertIfAbsent() { throw privateError; }, async read() { return { data: null, error: null }; } },
  ];
  for (const store of stores) {
    const result = await importProfileIfAbsent(profile(), store);
    assert.equal(result.status, 'error');
    assert.ok(result.error);
    assert.ok(!result.error.includes('private database detail'));
  }
});
