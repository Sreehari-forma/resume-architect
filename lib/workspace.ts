import 'server-only';
import { redirect } from 'next/navigation';
import type { WorkspaceData } from '@/types';
import { DEMO_PROFILE, EMPTY_PROFILE } from '@/lib/demo';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { profileSchema } from '@/lib/schemas';

export async function getWorkspace(): Promise<WorkspaceData> {
  if (!hasSupabaseConfig()) return { profile: structuredClone(DEMO_PROFILE), isDemo: true, userEmail: null };
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');
  const { data: record, error: readError } = await supabase.from('profiles').select('data').eq('user_id', user.id).maybeSingle();
  if (readError) throw new Error('Your profile could not be loaded. Check your connection and Supabase migration.');
  const parsed = record ? profileSchema.safeParse(record.data) : null;
  if (parsed && !parsed.success) throw new Error('Saved profile data could not be read. Please contact support.');
  return {
    profile: parsed?.success ? parsed.data : { ...structuredClone(EMPTY_PROFILE), email: user.email ?? '' },
    isDemo: false, userEmail: user.email ?? null,
  };
}
