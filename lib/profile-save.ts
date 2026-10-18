import type { UserProfile } from '@/types';
import { profileSchema } from '@/lib/schemas';

export type ProfileSaveResult = { ok: boolean; error?: string };

export interface ProfileSaveStore {
  write(userId: string, profile: UserProfile): Promise<{ error: unknown | null }>;
}

/** verifiedUserId must come from server-side authentication, never request data. */
export async function saveProfileForAccount(
  profile: unknown,
  expectedUserId: unknown,
  verifiedUserId: string | null,
  store: ProfileSaveStore,
): Promise<ProfileSaveResult> {
  if (!verifiedUserId || typeof expectedUserId !== 'string' || expectedUserId !== verifiedUserId) {
    return { ok: false, error: 'Your account changed or your session expired. Sign in to the original account before saving this profile.' };
  }
  const validated = profileSchema.safeParse(profile);
  if (!validated.success) return { ok: false, error: validated.error.issues[0].message };
  try {
    const { error } = await store.write(verifiedUserId, validated.data);
    if (!error) return { ok: true };
  } catch { /* Keep database and connection details out of the client response. */ }
  return { ok: false, error: 'Your profile could not be saved. Check your connection and try again.' };
}
