'use server';

import { revalidatePath } from 'next/cache';
import type { UserProfile } from '@/types';
import { profileSchema } from '@/lib/schemas';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

export async function saveProfile(profile: UserProfile): Promise<{ ok: boolean; error?: string }> {
  const result = profileSchema.safeParse(profile);
  if (!result.success) return { ok: false, error: result.error.issues[0].message };
  if (!hasSupabaseConfig()) return { ok: true }; // Demo persistence is browser-local and labeled in the UI.
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, error: 'Your session expired. Sign in again before saving.' };
  const { error } = await supabase.from('profiles').upsert({ user_id: user.id, data: result.data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) return { ok: false, error: 'Your profile could not be saved. Check your connection and try again.' };
  revalidatePath('/dashboard');
  revalidatePath('/studio');
  return { ok: true };
}
