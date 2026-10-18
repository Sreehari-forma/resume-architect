'use client';

import { useI18n } from '@/lib/i18n';

export default function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  return <div className="language-toggle" role="group" aria-label={t('Interface language')}>
    <button type="button" lang="en" aria-label="English" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>EN</button>
    <span aria-hidden="true">/</span>
    <button type="button" lang="pl" aria-label="Polski" aria-pressed={locale === 'pl'} onClick={() => setLocale('pl')}>PL</button>
  </div>;
}
