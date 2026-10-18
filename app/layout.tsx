import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { I18nProvider, SkipLink } from '@/lib/i18n';
import { parseLocale } from '@/lib/i18n/translate';
import './globals.css';
import './i18n.css';

export const metadata: Metadata = {
  title: { default: 'Forma — AI Resume Architect', template: '%s · Forma' },
  description: 'Build your CV in English or Polish. Free guest drafts and watermarked previews, with a clean PDF for a one-time payment.',
  icons: { icon: '/icon.svg' },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const initialLocale = parseLocale((await cookies()).get('forma-language')?.value);
  return <html lang={initialLocale ?? 'en'}><body><I18nProvider initialLocale={initialLocale}><SkipLink />{children}</I18nProvider></body></html>;
}
