import { commonTranslations } from './common';
import { builderTranslations } from './builder';
import { paymentTranslations } from './payments';

export type Locale = 'en' | 'pl';
export type TranslationParams = Record<string, string | number>;
export function parseLocale(value: unknown): Locale | undefined { return value === 'en' || value === 'pl' ? value : undefined; }
const dictionary: Record<string, string> = Object.assign(Object.create(null) as Record<string, string>, commonTranslations, builderTranslations, paymentTranslations);

// These exact formats come from our server assembler and Zod validation. Values
// such as skill names remain intact; unknown messages are never rewritten.
function messageTemplate(message: string): { key: string; params: TranslationParams } | undefined {
  let match = /^Rewrote (\d+) source-linked achievements? for clearer action and impact, retaining the recorded numbers\.$/.exec(message);
  if (match) return { key: 'Rewrote {count} source-linked achievements for clearer action and impact, retaining the recorded numbers.', params: { count: match[1] } };
  match = /^Prioritized job-relevant achievements in (\d+) roles?\.$/.exec(message);
  if (match) return { key: 'Prioritized job-relevant achievements in {count} roles.', params: { count: match[1] } };
  match = /^Emphasized (.+) from your existing skills\.$/.exec(message);
  if (match) return { key: 'Emphasized {skills} from your existing skills.', params: { skills: match[1] } };
  match = /^(String|Array) must contain at (most|least) (\d+) (character|element)\(s\)$/.exec(message);
  if (match) return { key: `${match[1]} must contain at ${match[2]} {count} ${match[4]}(s)`, params: { count: match[3] } };
  match = /^(NEXT_PUBLIC_APP_URL|NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY(?: or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)?|GEMINI_API_KEY|VERCEL_URL|VERCEL_PROJECT_PRODUCTION_URL) (.+\.)$/.exec(message);
  if (match && `{key} ${match[2]}` in dictionary) return { key: `{key} ${match[2]}`, params: { key: match[1] } };
  return undefined;
}

export function translate(locale: Locale, key: string, params?: TranslationParams): string {
  const template = locale === 'pl' && !(key in dictionary) ? messageTemplate(key) : undefined;
  const value = locale === 'pl' ? dictionary[template?.key ?? key] ?? key : key;
  const values = { ...template?.params, ...params };
  return value.replace(/\{(\w+)\}/g, (match, name: string) => Object.hasOwn(values, name) ? String(values[name]) : match);
}

export function formatAuthResult(locale: Locale, result: { error?: string; message?: string; rawError?: boolean }): string {
  // Supabase signup errors must be displayed exactly, including braces or text
  // resembling a translated validation message.
  return result.rawError ? result.error ?? '' : translate(locale, result.error || result.message || '');
}
