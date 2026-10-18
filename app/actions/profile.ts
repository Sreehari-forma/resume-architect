'use server';

import { revalidatePath } from 'next/cache';
import type { UserProfile } from '@/types';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { importProfileIfAbsent, type GuestProfileImportResult } from '@/lib/profile-import';
import { saveProfileForAccount, type ProfileSaveResult } from '@/lib/profile-save';

export async function saveProfile(profile: UserProfile, expectedUserId: string | null): Promise<ProfileSaveResult> {
  if (!hasSupabaseConfig()) return { ok: false, error: 'Sign in to save your profile. Account access is not configured in this environment.' };
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  const result = await saveProfileForAccount(profile, expectedUserId, authError ? null : user?.id ?? null, {
    async write(userId, validatedProfile) {
      const { error } = await supabase.from('profiles').upsert({ user_id: userId, data: validatedProfile, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      return { error };
    },
  });
  if (!result.ok) return result;
  revalidatePath('/dashboard');
  revalidatePath('/studio');
  return { ok: true };
}

export async function importGuestProfile(profile: UserProfile, expectedUserId: string): Promise<GuestProfileImportResult> {
  if (!hasSupabaseConfig()) return { status: 'error', error: 'Sign in to import your draft. Account access is not configured in this environment.' };
  if (typeof expectedUserId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(expectedUserId)) {
    return { status: 'error', error: 'Your account could not be verified. Sign in again before importing your draft.' };
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.id !== expectedUserId) {
    return { status: 'error', error: 'Your account changed or your session expired. Sign in again before importing your draft.' };
  }
  const result = await importProfileIfAbsent(profile, {
    async insertIfAbsent(validatedProfile) {
      const { error } = await supabase.from('profiles').upsert(
        { user_id: user.id, data: validatedProfile, updated_at: new Date().toISOString() },
        { onConflict: 'user_id', ignoreDuplicates: true },
      );
      return { error };
    },
    async read() {
      const { data, error } = await supabase.from('profiles').select('data').eq('user_id', user.id).maybeSingle();
      return { data: data?.data ?? null, error };
    },
  });
  if (result.status === 'imported') {
    revalidatePath('/dashboard');
    revalidatePath('/studio');
  }
  return result;
}
