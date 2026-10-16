import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { HttpError } from '@/lib/http';

const demoWindows = new Map<string, { expires: number; count: number }>();

export async function apiContext(action: 'tailor' | 'extract') {
  if (!hasSupabaseConfig()) {
    // Provider quota must never be exposed through an unauthenticated endpoint.
    if (process.env.GEMINI_API_KEY?.trim()) throw new HttpError(503, 'Connect Supabase authentication before enabling AI requests.');
    const now = Date.now();
    const current = demoWindows.get(action);
    const window = current && current.expires > now ? current : { expires: now + 60000, count: 0 };
    window.count += 1;
    demoWindows.set(action, window);
    if (window.count > 30) throw new HttpError(429, 'The demo is busy. Try again in a minute.');
    return { isDemo: true as const, user: null, supabase: null };
  }
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new HttpError(401, 'Your session expired. Sign in again to continue.');
  const { data: allowed, error: rateError } = await supabase.rpc('consume_rate_limit', { action_name: action });
  if (rateError) throw new HttpError(503, 'The workspace is not ready. Apply the Supabase migration before generating resumes.');
  if (!allowed) throw new HttpError(429, 'Your hourly request limit has been reached. Please try again later.');
  return { isDemo: false as const, user, supabase };
}
