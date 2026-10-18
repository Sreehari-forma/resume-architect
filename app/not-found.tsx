'use client';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
export default function NotFound(){ const {t}=useI18n(); return <main id="main-content" className="error-page"><span className="eyebrow">{t("404 / PAGE NOT FOUND")}</span><h1>{t("A fresh direction.")}</h1><p>{t("This page doesn’t exist. Your next chapter still does.")}</p><Link href="/studio" className="button button-primary">{t("Open the studio")}</Link></main>}
