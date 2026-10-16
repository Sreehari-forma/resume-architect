function readSupabaseConfig() {
  // Keep explicit env references so Next can inline these public values in the
  // browser client. Blank deployment settings must behave like absent settings.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return { url, key };
}

export function hasSupabaseConfig(): boolean {
  const { url, key } = readSupabaseConfig();
  return Boolean(url && key);
}

export function supabaseConfig() {
  const { url, key } = readSupabaseConfig();
  if (!url || !key) throw new Error('Supabase is not configured.');
  return { url, key };
}
