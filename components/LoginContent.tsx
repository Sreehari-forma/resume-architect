'use client';
import Link from 'next/link';
import { ArrowLeft, Check, FileText, Blocks, Sparkles } from 'lucide-react';
import { AuthForm } from '@/components/AuthForm';
import LanguageToggle from '@/components/LanguageToggle';
import { useI18n } from '@/lib/i18n';

export default function LoginContent({configured,initialError}:{configured:boolean;initialError?:string}) {
  const {t}=useI18n();
  return <main id="main-content" className="auth-page"><section className="auth-story"><Link href="/" className="auth-brand" aria-label={t("Forma home")}><span className="auth-brand-mark"><Blocks size={23} strokeWidth={1.6} /></span><span>forma<span className="auth-brand-period">.</span><small>{t("RESUME ARCHITECT")}</small></span></Link><div className="auth-story-content"><span className="eyebrow">{t("A BETTER WAY FORWARD")}</span><h1>{t("Your experience.")}<br />{t("Its best expression.")}</h1><p>{t("You bring the story. We help you shape it into a resume that opens the next door.")}</p><div className="auth-resume-card"><div className="auth-resume-card-header"><span className="auth-document-icon"><FileText size={22} /></span><div><strong>{t("Your next chapter")}</strong><span>{t("Built on your real experience")}</span></div><Sparkles size={17} /></div><div className="auth-resume-rule" /><div className="auth-resume-lines"><i /><i /><i /></div><div className="auth-resume-tags"><span><Check size={12} /> {t("ATS-friendly")}</span><span><Check size={12} /> {t("Authentically you")}</span></div></div><div className="auth-story-features"><span><Check size={14} /> {t("One profile, every opportunity")}</span><span><Check size={14} /> {t("Beautiful resumes. Clean LaTeX.")}</span></div></div><p className="auth-story-footer">{t("A little more clarity. A lot more possibility.")}</p></section><section className="auth-form-side"><div className="auth-header-actions"><Link href="/" className="auth-back"><ArrowLeft size={15} /> {t("Back to home")}</Link><LanguageToggle /></div><AuthForm configured={configured} initialError={initialError} /><p className="auth-form-footer">{t("Built for your career. Designed around you.")}</p></section></main>;
}
