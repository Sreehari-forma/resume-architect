'use client';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
export default function ErrorPage({reset}:{error:Error & {digest?:string};reset:()=>void}) {
  const {t}=useI18n();
  return <main id="main-content" className="error-page"><span className="eyebrow">{t("A SMALL INTERRUPTION")}</span><h1>{t("Let’s try that again.")}</h1><p>{t("We couldn’t load this workspace. Your saved profile is still available.")}</p><div className="flex gap-3"><button className="button button-primary" onClick={reset}>{t("Try again")}</button><Link href="/" className="button button-secondary">{t("Back to Forma")}</Link></div></main>;
}
