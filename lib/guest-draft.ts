import { z } from 'zod';
import type { TailoredResume, UserProfile } from '@/types';

export const GUEST_DRAFT_KEY = 'forma-guest-draft-v1';
const MAX_DRAFT_SIZE = 500_000;
const text = z.string().max(80_000);
const strings = z.array(text).max(500);
// Drafts must retain unfinished values (including partial emails/URLs and spaces).
// Strict profileSchema validation happens when writing to the account, not here.
export const draftProfileSchema = z.object({
  fullName: text, title: text, email: text, phone: text, linkedin: text,
  github: text, location: text, website: text, summary: text,
  experience: z.array(z.object({ id: text, company: text, role: text, location: text,
    startDate: text, endDate: text, current: z.boolean(), bullets: strings }).strict()).max(100),
  education: z.array(z.object({ id: text, school: text, degree: text, field: text,
    startDate: text, endDate: text }).strict()).max(100),
  skills: strings,
  projects: z.array(z.object({ id: text, name: text, description: text, url: text,
    technologies: strings, bullets: strings }).strict()).max(100),
  certifications: z.array(z.object({ id: text, name: text, issuer: text, date: text, url: text }).strict()).max(100),
}).strict();

const studioSchema = z.object({
  inputTab: z.enum(['text', 'url']), jobDescription: z.string().max(24_000),
  jobUrl: z.string().max(2000), outputTab: z.enum(['preview', 'latex']),
  generatedFor: z.string().max(24_000),
}).strict();
export type StudioDraft = z.infer<typeof studioSchema>;
export const EMPTY_STUDIO: StudioDraft = { inputTab: 'text', jobDescription: '', jobUrl: '', outputTab: 'preview', generatedFor: '' };

const resumeSchema = z.object({
  id: text, jobTitle: text, company: text, profile: draftProfileSchema,
  analysis: z.object({ matchScore: z.number().min(0).max(100), matchedKeywords: strings,
    missingKeywords: strings, highlights: strings }).strict(),
  latex: text, createdAt: text, mode: z.enum(['demo', 'ai']),
}).strict();
const guestDraftSchema = z.object({
  version: z.literal(1), id: z.string().min(1).max(100), updatedAt: z.number().finite(),
  profile: draftProfileSchema, studio: studioSchema, resume: resumeSchema.nullable(),
  intent: z.object({ action: z.enum(['save', 'export']), email: z.string().max(254).nullable() }).strict().nullable(),
}).strict();
export type GuestDraft = z.infer<typeof guestDraftSchema>;
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function browserStores(): StorageLike[] {
  if (typeof window === 'undefined') return [];
  const stores: StorageLike[] = [];
  try { stores.push(window.localStorage); } catch { /* Try session storage. */ }
  try { stores.push(window.sessionStorage); } catch { /* Report unavailable storage to the UI. */ }
  return stores;
}

export function readGuestDraft(stores = browserStores()): GuestDraft | null {
  const drafts: GuestDraft[] = [];
  for (const storage of stores) {
    try {
      const raw = storage.getItem(GUEST_DRAFT_KEY);
      if (!raw || raw.length > MAX_DRAFT_SIZE) continue;
      const parsed = guestDraftSchema.safeParse(JSON.parse(raw));
      if (parsed.success) drafts.push(parsed.data);
    } catch { /* A blocked/corrupt store must not prevent other stores restoring. */ }
  }
  return drafts.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
}

export function writeGuestDraft(draft: GuestDraft, stores = browserStores()): boolean {
  const raw = JSON.stringify(draft);
  if (raw.length > MAX_DRAFT_SIZE || !guestDraftSchema.safeParse(draft).success) return false;
  for (const storage of stores) {
    try {
      storage.setItem(GUEST_DRAFT_KEY, raw);
      // Remove stale fallback copies only after the new revision is durable.
      for (const other of stores) if (other !== storage) {
        try { other.removeItem(GUEST_DRAFT_KEY); } catch { /* Newest revision wins. */ }
      }
      return true;
    } catch { /* Quota/private browsing: try the next storage backend. */ }
  }
  return false;
}

export function clearImportedDraft(imported: GuestDraft, stores = browserStores()): boolean {
  let cleared = true;
  for (const storage of stores) {
    try {
      const current = readGuestDraft([storage]);
      if (!current) continue;
      if (current.id !== imported.id || current.updatedAt > imported.updatedAt) { cleared = false; continue; }
      storage.removeItem(GUEST_DRAFT_KEY);
    } catch { cleared = false; }
  }
  return cleared;
}

export function draftBelongsToEmail(draft: GuestDraft, email: string | null): boolean {
  return Boolean(email && draft.intent?.email && draft.intent.email === email.trim().toLowerCase());
}

export function prepareGuestDraftForAuth(email: string, stores = browserStores(), transferToAnotherAccount = false): boolean {
  const draft = readGuestDraft(stores);
  if (!draft) return true;
  // A normal sign-in to a different account must not silently claim this CV.
  if (draft.intent?.email && !draftBelongsToEmail(draft, email) && !transferToAnotherAccount) return true;
  return writeGuestDraft({ ...draft, updatedAt: Math.max(Date.now(), draft.updatedAt + 1),
    intent: { action: draft.intent?.action ?? 'save', email: email.trim().toLowerCase() } }, stores);
}

export function updateGuestDraft(previous: GuestDraft, patch: Partial<GuestDraft>, durable = readGuestDraft()): GuestDraft {
  // AuthForm may bind the draft while the editor is still mounted (confirmation
  // email flow). Preserve that newer binding when editing resumes in the same tab.
  const latest = durable?.id === previous.id && durable.updatedAt > previous.updatedAt ? durable : previous;
  return { ...latest, ...patch,
    intent: patch.intent ? { ...patch.intent, email: patch.intent.email ?? latest.intent?.email ?? null } : latest.intent,
    updatedAt: Math.max(Date.now(), previous.updatedAt + 1, latest.updatedAt + 1) };
}

export function newGuestDraft(profile: UserProfile): GuestDraft {
  return { version: 1, id: crypto.randomUUID(), updatedAt: Date.now(), profile,
    studio: { ...EMPTY_STUDIO }, resume: null, intent: null };
}

const accountCacheSchema = z.object({ profileSnapshot: z.string().max(MAX_DRAFT_SIZE), studio: studioSchema, resume: resumeSchema.nullable() });
export function readAccountStudio(userId: string, profile: UserProfile): { studio: StudioDraft; resume: TailoredResume | null } | null {
  try {
    const raw = sessionStorage.getItem(`forma-studio-${userId}`);
    if (!raw || raw.length > MAX_DRAFT_SIZE) return null;
    const parsed = accountCacheSchema.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data.profileSnapshot === JSON.stringify(profile) ? parsed.data : null;
  } catch { return null; }
}

export function writeAccountStudio(userId: string, profile: UserProfile, studio: StudioDraft, resume: TailoredResume | null): boolean {
  try {
    sessionStorage.setItem(`forma-studio-${userId}`, JSON.stringify({ profileSnapshot: JSON.stringify(profile), studio, resume }));
    return true;
  } catch { return false; }
}
