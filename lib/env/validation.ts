/** Pure parsers shared by runtime code and next.config. No env reads or Next imports. */
export class EnvironmentError extends Error {
  constructor(key: string, requirement: string) {
    super(`${key} ${requirement}.`);
    this.name = 'EnvironmentError';
  }
}

export function optionalEnvironmentValue(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

export function isLoopbackHostname(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
}

export function parseEnvironmentUrl(value: string | undefined, key: string, originOnly = false): string | undefined {
  const normalized = optionalEnvironmentValue(value);
  if (!normalized) return undefined;
  // URL() silently discards embedded tabs/newlines and normalizes backslashes.
  // Reject them before parsing, after trimming harmless surrounding whitespace.
  if (/[\p{Cc}\p{Cf}\\'"`“”‘’]/u.test(normalized)) {
    throw new EnvironmentError(key, 'contains invalid control, quote, or backslash characters');
  }
  let url: URL;
  try { url = new URL(normalized); }
  catch { throw new EnvironmentError(key, 'must be a valid HTTP(S) URL'); }
  const authority = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)/i.exec(normalized)?.[1];
  if (!['http:', 'https:'].includes(url.protocol) || !authority || authority.includes('@') || url.username || url.password) {
    throw new EnvironmentError(key, 'must be an HTTP(S) URL without credentials');
  }
  if (url.protocol !== 'https:' && !isLoopbackHostname(url.hostname)) {
    throw new EnvironmentError(key, 'must use HTTPS except for a loopback development host');
  }
  // Validate the raw origin syntax as well as the parsed URL. Otherwise paths
  // such as /studio/.. normalize to / and disguise a malformed origin setting.
  // Repeated trailing root slashes are harmless and canonicalize to url.origin.
  const isRawOrigin = /^https?:\/\/[^/?#]+\/*$/i.test(normalized);
  if (url.href.includes('?') || url.href.includes('#') || (originOnly && !isRawOrigin)) {
    throw new EnvironmentError(key, originOnly ? 'must contain only an origin, without a path, query, or fragment' : 'must not contain a query or fragment');
  }
  return originOnly ? url.origin : url.href.replace(/\/$/, '');
}

export interface SupabaseEnvironmentInput {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
}

export function parseSupabaseEnvironment(input: SupabaseEnvironmentInput): { url?: string; key?: string } {
  return {
    url: parseEnvironmentUrl(input.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    key: optionalEnvironmentValue(input.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
      || optionalEnvironmentValue(input.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

export function requireSupabaseEnvironment(input: SupabaseEnvironmentInput): { url: string; key: string } {
  const { url, key } = parseSupabaseEnvironment(input);
  if (!url) throw new EnvironmentError('NEXT_PUBLIC_SUPABASE_URL', 'is required to initialize Supabase');
  if (!key) throw new EnvironmentError('NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'is required to initialize Supabase');
  return { url, key };
}

export function parseAppOrigin(value: string | undefined): string | undefined {
  return parseEnvironmentUrl(value, 'NEXT_PUBLIC_APP_URL', true);
}
