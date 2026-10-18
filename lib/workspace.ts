import 'server-only';
import type { WorkspaceData } from '@/types';
import { EMPTY_PROFILE } from '@/lib/demo';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { profileSchema } from '@/lib/schemas';

export async function getWorkspace(): Promise<WorkspaceData> {
  const authConfigured = hasSupabaseConfig();
  const guestWorkspace: WorkspaceData = {
    profile: structuredClone(EMPTY_PROFILE), isDemo: !authConfigured, isGuest: true,
    authConfigured, userId: null, userEmail: null, hasSavedProfile: false,
  };
  if (!authConfigured) return guestWorkspace;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return guestWorkspace;
  const { data: record, error: readError } = await supabase.from('profiles').select('data').eq('user_id', user.id).maybeSingle();
  if (readError) throw new Error('Your profile could not be loaded. Check your connection and Supabase migration.');
  const parsed = record ? profileSchema.safeParse(record.data) : null;
  if (parsed && !parsed.success) throw new Error('Saved profile data could not be read. Please contact support.');
  return {
    profile: parsed?.success ? parsed.data : { ...structuredClone(EMPTY_PROFILE), email: user.email ?? '' },
    isDemo: false, isGuest: false, authConfigured: true,
    userId: user.id, userEmail: user.email ?? null, hasSavedProfile: Boolean(record),
  };
}
