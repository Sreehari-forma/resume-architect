import type { UserProfile } from '@/types';
import { profileSchema } from '@/lib/schemas';

export type GuestProfileImportResult = { status: 'imported' | 'existing' | 'error'; error?: string };

/** The adapter is scoped to a server-verified user before this function runs. */
export interface ProfileImportStore {
  insertIfAbsent(profile: UserProfile): Promise<{ error: unknown | null }>;
  read(): Promise<{ data: unknown | null; error: unknown | null }>;
}

/** Never updates an existing row. A retry is successful only for the same draft. */
export async function importProfileIfAbsent(profile: unknown, store: ProfileImportStore): Promise<GuestProfileImportResult> {
  const validated = profileSchema.safeParse(profile);
  if (!validated.success) return { status: 'error', error: validated.error.issues[0].message };
  try {
    const inserted = await store.insertIfAbsent(validated.data);
    if (inserted.error) return { status: 'error', error: 'Your draft could not be imported. It is still available in this browser; please try again.' };
    // Reading after ON CONFLICT DO NOTHING handles both a retry and another tab
    // creating the account profile between authentication and this operation.
    const saved = await store.read();
    if (saved.error || saved.data === null) {
      return { status: 'error', error: 'The saved profile could not be verified. Your browser draft has been kept; please retry.' };
    }
    const existing = profileSchema.safeParse(saved.data);
    if (existing.success && JSON.stringify(existing.data) === JSON.stringify(validated.data)) return { status: 'imported' };
    return { status: 'existing' };
  } catch {
    return { status: 'error', error: 'Your draft could not be imported. It is still available in this browser; please try again.' };
  }
}
