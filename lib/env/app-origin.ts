import { EnvironmentError, isLoopbackHostname, optionalEnvironmentValue, parseAppOrigin, parseEnvironmentUrl } from './validation';

export interface AppOriginInput {
  NEXT_PUBLIC_APP_URL?: string;
  VERCEL_ENV?: string;
  VERCEL_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
}

export function requireDeploymentOrigin(value: string, key: string): void {
  const url = new URL(value);
  const hostname = url.hostname.replace(/\.$/, '');
  const loopback = isLoopbackHostname(hostname) || hostname.endsWith('.localhost')
    || /^127\./.test(hostname) || /^\[::ffff:7f[0-9a-f]{2}:/i.test(hostname);
  if (url.protocol !== 'https:' || loopback) {
    throw new EnvironmentError(key, 'must use HTTPS with a non-loopback production host');
  }
}

/** Pure resolver shared by server helpers and build validation. Never trusts request headers. */
export function resolveAppOrigin(input: AppOriginInput): string | undefined {
  const configured = parseAppOrigin(input.NEXT_PUBLIC_APP_URL);
  if (configured) return configured;

  // The production hostname is also present in previews. Only use it in production,
  // otherwise PKCE verification and session cookies would move to another host.
  const key = input.VERCEL_ENV === 'production' && optionalEnvironmentValue(input.VERCEL_PROJECT_PRODUCTION_URL)
    ? 'VERCEL_PROJECT_PRODUCTION_URL' : 'VERCEL_URL';
  const value = optionalEnvironmentValue(input[key]);
  if (!value) return undefined;
  // Vercel normally supplies hostnames without a scheme; also accept an HTTPS origin.
  const origin = parseEnvironmentUrl(value.includes('://') ? value : `https://${value}`, key, true);
  if (!origin) return undefined;
  requireDeploymentOrigin(origin, key);
  return origin;
}
