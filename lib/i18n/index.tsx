'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { parseLocale, translate, type Locale, type TranslationParams } from './translate';
export { translate } from './translate';
export type { Locale, TranslationParams } from './translate';
const storageKey = 'forma-language';

type I18nContextValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (key: string, params?: TranslationParams) => string };
const I18nContext = createContext<I18nContextValue>({ locale: 'en', setLocale: () => {}, t: (key, params) => translate('en', key, params) });

function readPreference(): Locale | null {
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    try { const value = parseLocale(window[name].getItem(storageKey)); if (value) return value; } catch { /* Cookies retain the preference when browser storage is unavailable. */ }
  }
  return null;
}

export function I18nProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale?: Locale }) {
  const [locale, updateLocale] = useState<Locale>(initialLocale ?? 'en');
  useEffect(() => { if (!initialLocale) { const saved = readPreference(); if (saved) updateLocale(saved); } }, [initialLocale]);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  function setLocale(value: Locale) {
    updateLocale(value);
    for (const name of ['localStorage', 'sessionStorage'] as const) {
      try { window[name].setItem(storageKey, value); } catch { /* The in-memory preference still works. */ }
    }
    try { document.cookie = `forma-language=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`; } catch { /* Browser storage and the active session retain the selection. */ }
  }
  return <I18nContext.Provider value={{ locale, setLocale, t: (key, params) => translate(locale, key, params) }}>{children}</I18nContext.Provider>;
}

export function useI18n() { return useContext(I18nContext); }
export function SkipLink() { const { t } = useI18n(); return <a className="skip-link" href="#main-content">{t('Skip to content')}</a>; }
