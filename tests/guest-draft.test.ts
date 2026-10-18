import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_STUDIO,
  GUEST_DRAFT_KEY,
  clearImportedDraft,
  draftBelongsToEmail,
  newGuestDraft,
  prepareGuestDraftForAuth,
  readGuestDraft,
  updateGuestDraft,
  writeGuestDraft,
  type GuestDraft,
  type StorageLike,
} from '../lib/guest-draft';
import type { TailoredResume, UserProfile } from '../types';

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  blockRead = false;
  blockWrite = false;
  blockRemove = false;

  constructor(raw?: string) {
    if (raw !== undefined) this.values.set(GUEST_DRAFT_KEY, raw);
  }

  getItem(key: string): string | null {
    if (this.blockRead) throw new Error('Storage access denied');
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.blockWrite) throw new Error('Storage quota exceeded');
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    if (this.blockRemove) throw new Error('Storage access denied');
    this.values.delete(key);
  }
}

function unfinishedProfile(): UserProfile {
  return {
    fullName: '  Jordan Lee  ', title: 'Product engineer ', email: 'jordan@',
    phone: '+48 ', linkedin: 'https://linkedin.com/in/', github: 'https://',
    location: ' Warsaw ', website: 'https://portfolio.',
    summary: 'First line.\n\n  A thought still in progress ',
    experience: [{ id: 'experience-1', company: ' Example Co ', role: ' Engineer',
      location: 'Remote ', startDate: '202', endDate: '', current: false,
      bullets: ['  Improved performance by 20% ', '', 'Writing the next achievement '] }],
    education: [{ id: 'education-1', school: ' University ', degree: ' B.S.',
      field: 'Computer Science ', startDate: '201', endDate: '' }],
    skills: [' TypeScript ', 'Graph'],
    projects: [{ id: 'project-1', name: 'Personal project ', description: ' In progress\n',
      url: 'https://project.', technologies: [' React', ' '], bullets: ['Built ', ''] }],
    certifications: [{ id: 'certification-1', name: 'Cloud certificate ', issuer: ' Provider ',
      date: '2026-', url: 'https://credentials.' }],
  };
}

function fixture(): GuestDraft {
  return { ...newGuestDraft(unfinishedProfile()), id: 'guest-draft-1', updatedAt: 1_000 };
}

function resumeFixture(profile: UserProfile): TailoredResume {
  return {
    id: 'resume-1', jobTitle: 'Product Engineer', company: 'Example Co', profile,
    analysis: { matchScore: 75, matchedKeywords: ['TypeScript'], missingKeywords: ['PostgreSQL'],
      highlights: ['Moved the relevant achievement first.'] },
    latex: String.raw`\documentclass{article}
\begin{document}
Jordan Lee: 20\% improvement
\end{document}`,
    createdAt: '2026-10-18T12:00:00.000Z', mode: 'demo',
  };
}

test('unfinished profile fields, whitespace, and empty achievement lines survive a draft round trip', () => {
  const draft = fixture();
  const storage = new MemoryStorage();

  assert.equal(writeGuestDraft(draft, [storage]), true);
  const restored = readGuestDraft([storage]);
  assert.ok(restored);
  assert.deepEqual(restored.profile, draft.profile);
  assert.equal(restored.profile.email, 'jordan@');
  assert.equal(restored.profile.github, 'https://');
  assert.equal(restored.profile.summary, 'First line.\n\n  A thought still in progress ');
  assert.deepEqual(restored.profile.experience[0].bullets, draft.profile.experience[0].bullets);
  assert.deepEqual(restored.profile.skills, [' TypeScript ', 'Graph']);
});

test('studio selections, unfinished job inputs, analysis, and generated LaTeX survive reload', () => {
  const draft = fixture();
  draft.studio = {
    inputTab: 'url', jobDescription: '  Product engineer\nBuild useful tools.\n',
    jobUrl: 'https://jobs.example.com/role?', outputTab: 'latex',
    generatedFor: 'Product engineer\nBuild useful tools.',
  };
  draft.resume = resumeFixture(draft.profile);
  draft.intent = { action: 'export', email: null };
  const storage = new MemoryStorage();

  assert.equal(writeGuestDraft(draft, [storage]), true);
  assert.deepEqual(readGuestDraft([storage]), draft);
});

test('new drafts have independent empty studio state and no account import permission', () => {
  const first = newGuestDraft(unfinishedProfile());
  const second = newGuestDraft(unfinishedProfile());

  assert.notEqual(first.id, second.id);
  assert.deepEqual(first.studio, EMPTY_STUDIO);
  assert.equal(first.resume, null);
  assert.equal(first.intent, null);
  first.studio.jobDescription = 'Only the first draft';
  assert.deepEqual(second.studio, EMPTY_STUDIO);
});

test('blocked local storage falls back to session storage for both writes and restoration', () => {
  const local = new MemoryStorage();
  local.blockRead = true;
  local.blockWrite = true;
  local.blockRemove = true;
  const session = new MemoryStorage();
  const draft = fixture();

  assert.equal(writeGuestDraft(draft, [local, session]), true);
  assert.equal(local.values.has(GUEST_DRAFT_KEY), false);
  assert.ok(session.values.has(GUEST_DRAFT_KEY));
  assert.deepEqual(readGuestDraft([local, session]), draft);
});

test('restoration ignores corrupt, incompatible, oversized, and invalid records without deleting them', () => {
  const valid = fixture();
  const invalidResume = resumeFixture(valid.profile);
  invalidResume.analysis.matchScore = 101;
  const corruptEntries = [
    '{unfinished json',
    'null',
    JSON.stringify({ ...valid, version: 2 }),
    JSON.stringify({ ...valid, profile: { ...valid.profile, email: 42 } }),
    JSON.stringify({ ...valid, resume: invalidResume }),
    'x'.repeat(500_001),
  ];

  for (const raw of corruptEntries) {
    const corrupt = new MemoryStorage(raw);
    const fallback = new MemoryStorage(JSON.stringify(valid));
    assert.equal(readGuestDraft([corrupt]), null);
    assert.deepEqual(readGuestDraft([corrupt, fallback]), valid);
    assert.equal(corrupt.values.get(GUEST_DRAFT_KEY), raw);
  }
});

test('restoration selects the newest valid revision even when it lives in the fallback store', () => {
  const older = fixture();
  const newer = { ...older, updatedAt: older.updatedAt + 1, profile: { ...older.profile, title: 'Updated title' } };
  const local = new MemoryStorage(JSON.stringify(older));
  const session = new MemoryStorage(JSON.stringify(newer));

  assert.deepEqual(readGuestDraft([local, session]), newer);
  assert.deepEqual(readGuestDraft([session, local]), newer);
});

test('failed writes preserve every existing durable copy of the draft', () => {
  const existing = fixture();
  const previousFallback = { ...existing, updatedAt: existing.updatedAt - 1 };
  const localRaw = JSON.stringify(existing);
  const sessionRaw = JSON.stringify(previousFallback);
  const local = new MemoryStorage(localRaw);
  const session = new MemoryStorage(sessionRaw);
  local.blockWrite = true;
  session.blockWrite = true;
  const edited = { ...existing, updatedAt: existing.updatedAt + 1,
    profile: { ...existing.profile, title: 'New unsaved title' } };

  assert.equal(writeGuestDraft(edited, [local, session]), false);
  assert.equal(local.values.get(GUEST_DRAFT_KEY), localRaw);
  assert.equal(session.values.get(GUEST_DRAFT_KEY), sessionRaw);
  assert.deepEqual(readGuestDraft([local, session]), existing);
});

test('invalid or oversized drafts do not overwrite the last recoverable draft', () => {
  const existing = fixture();
  const oldRaw = JSON.stringify(existing);
  const storage = new MemoryStorage(oldRaw);
  const invalid = { ...existing, profile: { ...existing.profile, summary: 'x'.repeat(80_001) } };
  const oversized = structuredClone(existing);
  for (const field of ['fullName', 'title', 'email', 'phone', 'linkedin', 'github', 'location'] as const) {
    oversized.profile[field] = 'x'.repeat(80_000);
  }

  assert.equal(writeGuestDraft(invalid, [storage]), false);
  assert.equal(storage.values.get(GUEST_DRAFT_KEY), oldRaw);
  assert.equal(writeGuestDraft(oversized, [storage]), false);
  assert.equal(storage.values.get(GUEST_DRAFT_KEY), oldRaw);
  assert.deepEqual(readGuestDraft([storage]), existing);
});

test('a draft cannot be imported without an explicit matching authentication email binding', () => {
  const draft = fixture();
  draft.profile.email = 'jordan@example.com';
  assert.equal(draftBelongsToEmail(draft, 'jordan@example.com'), false);

  draft.intent = { action: 'save', email: null };
  assert.equal(draftBelongsToEmail(draft, 'jordan@example.com'), false);
  draft.intent.email = 'jordan@example.com';
  assert.equal(draftBelongsToEmail(draft, null), false);
  assert.equal(draftBelongsToEmail(draft, ''), false);
  assert.equal(draftBelongsToEmail(draft, 'another@example.com'), false);
  assert.equal(draftBelongsToEmail(draft, '  JORDAN@EXAMPLE.COM  '), true);
});

test('preparing authentication case-folds the binding and preserves export intent and all draft data', () => {
  const draft = fixture();
  draft.updatedAt = Date.now() + 60_000;
  draft.intent = { action: 'export', email: null };
  draft.studio = { ...EMPTY_STUDIO, jobDescription: 'A role in progress ', outputTab: 'latex' };
  draft.resume = resumeFixture(draft.profile);
  const storage = new MemoryStorage(JSON.stringify(draft));

  assert.equal(prepareGuestDraftForAuth('  JORDAN@EXAMPLE.COM  ', [storage]), true);
  const prepared = readGuestDraft([storage]);
  assert.ok(prepared);
  assert.equal(prepared.id, draft.id);
  assert.equal(prepared.updatedAt, draft.updatedAt + 1);
  assert.deepEqual(prepared.intent, { action: 'export', email: 'jordan@example.com' });
  assert.deepEqual(prepared.profile, draft.profile);
  assert.deepEqual(prepared.studio, draft.studio);
  assert.deepEqual(prepared.resume, draft.resume);
  assert.equal(draftBelongsToEmail(prepared, 'jordan@example.com'), true);
});

test('authentication preparation defaults to save without creating a phantom draft', () => {
  const empty = new MemoryStorage();
  assert.equal(prepareGuestDraftForAuth('jordan@example.com', [empty]), true);
  assert.equal(empty.values.has(GUEST_DRAFT_KEY), false);

  const storage = new MemoryStorage(JSON.stringify(fixture()));
  assert.equal(prepareGuestDraftForAuth('jordan@example.com', [storage]), true);
  assert.deepEqual(readGuestDraft([storage])?.intent, { action: 'save', email: 'jordan@example.com' });
});

test('failed authentication preparation keeps the previous draft and does not authorize an import', () => {
  const draft = fixture();
  const raw = JSON.stringify(draft);
  const storage = new MemoryStorage(raw);
  storage.blockWrite = true;

  assert.equal(prepareGuestDraftForAuth('jordan@example.com', [storage]), false);
  assert.equal(storage.values.get(GUEST_DRAFT_KEY), raw);
  const restored = readGuestDraft([storage]);
  assert.ok(restored);
  assert.equal(draftBelongsToEmail(restored, 'jordan@example.com'), false);
});

test('editing a mounted draft after authentication preparation preserves the durable email binding', () => {
  const mounted = fixture();
  const storage = new MemoryStorage(JSON.stringify(mounted));
  assert.equal(prepareGuestDraftForAuth('jordan@example.com', [storage]), true);
  const prepared = readGuestDraft([storage]);
  assert.ok(prepared);
  assert.equal(mounted.intent, null);

  const editedProfile = { ...mounted.profile, summary: 'Updated while awaiting the confirmation email' };
  const edited = updateGuestDraft(mounted, { profile: editedProfile }, prepared);

  assert.deepEqual(edited.profile, editedProfile);
  assert.deepEqual(edited.intent, { action: 'save', email: 'jordan@example.com' });
  assert.ok(edited.updatedAt > prepared.updatedAt);
  assert.equal(writeGuestDraft(edited, [storage]), true);
  const restored = readGuestDraft([storage]);
  assert.ok(restored);
  assert.equal(draftBelongsToEmail(restored, 'jordan@example.com'), true);
  assert.equal(restored.profile.summary, editedProfile.summary);
});

test('requesting export with a null email retains the binding prepared by the authentication form', () => {
  const mounted = fixture();
  const prepared: GuestDraft = {
    ...mounted, updatedAt: mounted.updatedAt + 1,
    intent: { action: 'save', email: 'jordan@example.com' },
  };

  const updated = updateGuestDraft(mounted, { intent: { action: 'export', email: null } }, prepared);

  assert.deepEqual(updated.intent, { action: 'export', email: 'jordan@example.com' });
  assert.deepEqual(updated.profile, mounted.profile);
  assert.equal(draftBelongsToEmail(updated, 'jordan@example.com'), true);
});

test('a different durable draft never supplies another account binding or replaces mounted content', () => {
  const mounted = fixture();
  const otherDraft: GuestDraft = {
    ...fixture(), id: 'another-guest-draft', updatedAt: mounted.updatedAt + 100,
    profile: { ...mounted.profile, fullName: 'A different person' },
    intent: { action: 'save', email: 'another@example.com' },
  };

  const updated = updateGuestDraft(mounted, { intent: { action: 'export', email: null } }, otherDraft);

  assert.equal(updated.id, mounted.id);
  assert.deepEqual(updated.profile, mounted.profile);
  assert.deepEqual(updated.intent, { action: 'export', email: null });
  assert.equal(draftBelongsToEmail(updated, 'another@example.com'), false);
});

test('ordinary authentication does not rebind a draft to a different account but explicit transfer does', () => {
  const draft = fixture();
  draft.intent = { action: 'export', email: 'jordan@example.com' };
  draft.resume = resumeFixture(draft.profile);
  const raw = JSON.stringify(draft);
  const storage = new MemoryStorage(raw);

  assert.equal(prepareGuestDraftForAuth('new-account@example.com', [storage]), true);
  assert.equal(storage.values.get(GUEST_DRAFT_KEY), raw);
  const unchanged = readGuestDraft([storage]);
  assert.ok(unchanged);
  assert.equal(draftBelongsToEmail(unchanged, 'new-account@example.com'), false);

  assert.equal(prepareGuestDraftForAuth('  NEW-ACCOUNT@EXAMPLE.COM  ', [storage], true), true);
  const transferred = readGuestDraft([storage]);
  assert.ok(transferred);
  assert.deepEqual(transferred.intent, { action: 'export', email: 'new-account@example.com' });
  assert.equal(draftBelongsToEmail(transferred, 'new-account@example.com'), true);
  assert.equal(draftBelongsToEmail(transferred, 'jordan@example.com'), false);
  assert.deepEqual(transferred.profile, draft.profile);
  assert.deepEqual(transferred.resume, draft.resume);
  assert.deepEqual(transferred.studio, draft.studio);
});

test('import cleanup removes imported copies while preserving newer revisions and different drafts', () => {
  const imported = fixture();
  const exact = new MemoryStorage(JSON.stringify(imported));
  const older = new MemoryStorage(JSON.stringify({ ...imported, updatedAt: imported.updatedAt - 1 }));
  const newerRaw = JSON.stringify({ ...imported, updatedAt: imported.updatedAt + 1,
    profile: { ...imported.profile, title: 'Edited after import began' } });
  const differentRaw = JSON.stringify({ ...imported, id: 'another-guest-draft', updatedAt: imported.updatedAt - 10 });
  const newer = new MemoryStorage(newerRaw);
  const different = new MemoryStorage(differentRaw);

  assert.equal(clearImportedDraft(imported, [exact, older, newer, different]), false);
  assert.equal(exact.values.has(GUEST_DRAFT_KEY), false);
  assert.equal(older.values.has(GUEST_DRAFT_KEY), false);
  assert.equal(newer.values.get(GUEST_DRAFT_KEY), newerRaw);
  assert.equal(different.values.get(GUEST_DRAFT_KEY), differentRaw);
});

test('import cleanup reports removal failures while leaving the durable copy recoverable', () => {
  const imported = fixture();
  const storage = new MemoryStorage(JSON.stringify(imported));
  storage.blockRemove = true;

  assert.equal(clearImportedDraft(imported, [storage]), false);
  assert.deepEqual(readGuestDraft([storage]), imported);
  storage.blockRemove = false;
  assert.equal(clearImportedDraft(imported, [storage]), true);
  assert.equal(readGuestDraft([storage]), null);
});
