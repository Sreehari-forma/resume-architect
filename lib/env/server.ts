import 'server-only';
import { EnvironmentError, optionalEnvironmentValue } from './validation';
import { resolveAppOrigin } from './app-origin';

const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

export function getServerAppOrigin(): string | undefined {
  return resolveAppOrigin({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  });
}

export function getAuthCallbackUrl(): string {
  const origin = getServerAppOrigin()
    || (process.env.NODE_ENV === 'development' && !process.env.VERCEL_ENV ? 'http://127.0.0.1:3000' : undefined);
  if (!origin) throw new EnvironmentError('NEXT_PUBLIC_APP_URL', 'is required for authentication when no Vercel deployment URL is available');
  return new URL('/auth/callback', origin).href;
}

export function getGeminiEnvironment(): { apiKey?: string; model: string } {
  return {
    apiKey: optionalEnvironmentValue(process.env.GEMINI_API_KEY),
    model: optionalEnvironmentValue(process.env.GEMINI_MODEL) || DEFAULT_GEMINI_MODEL,
  };
}

export function requireGeminiEnvironment(): { apiKey: string; model: string } {
  const { apiKey, model } = getGeminiEnvironment();
  if (!apiKey) throw new EnvironmentError('GEMINI_API_KEY', 'is required in the server environment for AI generation');
  return { apiKey, model };
}
