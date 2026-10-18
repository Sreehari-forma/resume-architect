import { parseAppOrigin, parseSupabaseEnvironment, type SupabaseEnvironmentInput } from './validation';

/** Explicit accesses are required for Next's public environment substitution. */
export function readPublicSupabaseEnvironment(): SupabaseEnvironmentInput {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function getSupabaseEnvironment(): { url?: string; key?: string } {
  return parseSupabaseEnvironment(readPublicSupabaseEnvironment());
}

export function getAppOrigin(): string | undefined {
  return parseAppOrigin(process.env.NEXT_PUBLIC_APP_URL);
}
