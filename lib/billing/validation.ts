import 'server-only';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { profileSchema } from '@/lib/schemas';
import type { ResumeLocale } from './catalog';
import type { UserProfile } from '@/types';

export const snapshotRequestSchema = z.object({ profile: profileSchema, locale: z.enum(['en', 'pl']) }).strict();
export const checkoutRequestSchema = z.object({ profile: profileSchema, locale: z.enum(['en', 'pl']), currency: z.enum(['pln', 'usd', 'eur']) }).strict();
export const resumeIdSchema = z.string().uuid();
export const sessionIdSchema = z.string().regex(/^cs_(test_|live_)?[a-zA-Z0-9]{8,200}$/);

/** Zod establishes stable field ordering and trims content before hashing. */
export function resumeFingerprint(profile: UserProfile, locale: ResumeLocale): string {
  const normalized = snapshotRequestSchema.parse({ profile, locale });
  return createHash('sha256').update(JSON.stringify({ version: 1, ...normalized })).digest('hex');
}
