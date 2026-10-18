import { getSupabaseEnvironment, readPublicSupabaseEnvironment } from '@/lib/env/public';
import { requireSupabaseEnvironment } from '@/lib/env/validation';

export function hasSupabaseConfig(): boolean {
  const { url, key } = getSupabaseEnvironment();
  return Boolean(url && key);
}

export function supabaseConfig() {
  return requireSupabaseEnvironment(readPublicSupabaseEnvironment());
}
