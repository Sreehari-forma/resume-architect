'use client';

import Link from 'next/link';
import LanguageToggle from '@/components/LanguageToggle';
import { useI18n } from '@/lib/i18n';
import { ArrowUpRight, Blocks, ChevronRight, CircleHelp, FileText, Fingerprint, LogOut, Sparkles, Vault } from 'lucide-react';
import { useWorkspace } from '@/lib/store';
import { signOut } from '@/app/actions/auth';
import { profileCompleteness } from '@/lib/demo';

export default function AppShell({ children, active }: {children: React.ReactNode; active: 'dashboard' | 'studio'}) {
  const {t}=useI18n();
  const { profile, isGuest, authConfigured, draftStorageError, requestAuth, userEmail } = useWorkspace();
  const completeness = profileCompleteness(profile);
  const initials = profile.fullName.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('') || 'Y';
  return <div className="workspace-shell">
    <aside className="workspace-sidebar">
      <Link href="/" className="brand" aria-label={t("Forma home")}><span className="brand-icon"><Blocks size={23} strokeWidth={1.6}/></span><span>forma<span className="brand-period">.</span><small>{t("RESUME ARCHITECT")}</small></span></Link>
      <div className="sidebar-group"><p className="sidebar-label">{t("YOUR WORKSPACE")}</p><nav aria-label={t("Workspace")}><Link className={`sidebar-link ${active === 'dashboard' ? 'active' : ''}`} aria-current={active === 'dashboard' ? 'page' : undefined} href="/dashboard"><Vault size={18}/>{t("Master Vault")}<span className="nav-complete">{completeness}%</span></Link><Link className={`sidebar-link ${active === 'studio' ? 'active' : ''}`} aria-current={active === 'studio' ? 'page' : undefined} href="/studio"><Sparkles size={18}/>{t("Tailoring Studio")}<ChevronRight size={14} className="nav-chevron"/></Link></nav></div>
      <div className="sidebar-journey"><span className="sidebar-label">{t("A LITTLE MORE INTENTIONAL")}</span><div><span className="journey-point"><Fingerprint size={14}/></span><p>{t("Your experience")}<small>{t("A single source of truth")}</small></p></div><div><span className="journey-point"><Sparkles size={14}/></span><p>{t("Your next opportunity")}<small>{t("A more focused story")}</small></p></div><div><span className="journey-point"><FileText size={14}/></span><p>{t("Your next chapter")}<small>{t("Ready to make an impression")}</small></p></div></div>
      <div className="sidebar-bottom">{isGuest && <div className="demo-note"><span className="status-dot"/><strong>{t("Your guest workspace.")}</strong><p>{t(draftStorageError ? 'Browser storage is unavailable. Keep this page open to retain your draft.' : 'Your draft is kept in this browser as you edit.')} {t(authConfigured ? 'Save drafts freely. Create an account when you are ready to buy a clean final PDF.' : 'You can save drafts and download watermarked demo PDFs here. Final purchases need account setup.')}</p><button type="button" className="button button-ghost" style={{ width: '100%', minHeight: 32, padding: '7px 0', fontSize: 10, justifyContent: 'space-between' }} onClick={() => requestAuth('save')}>{t(authConfigured ? 'Create an account' : 'Account setup')} <ArrowUpRight size={13}/></button></div>}<Link href="/#faq" className="sidebar-help"><CircleHelp size={16}/>{t("A little guidance")}<ArrowUpRight size={14}/></Link><div className="sidebar-person"><span className="avatar">{initials}</span><div><strong>{profile.fullName || t('Your workspace')}</strong><small>{isGuest ? t('Guest · drafts saved in this browser') : userEmail}</small></div>{!isGuest && <form action={signOut}><button className="icon-button" title={t("Sign out")} aria-label={t("Sign out")}><LogOut size={16}/></button></form>}</div></div>
    </aside>
    <div className="workspace-body"><header className="workspace-topbar"><div><span>{t("Workspace")}</span><ChevronRight size={13}/><strong>{t(active === 'studio' ? 'Tailoring Studio' : 'Master Vault')}</strong></div><div className="workspace-topbar-actions"><LanguageToggle />{isGuest ? <button type="button" className="workspace-status" style={{ background: 'transparent', border: 0, padding: '4px 0', minHeight: 32 }} onClick={() => requestAuth('save')}><span className="status-dot"/>{t(authConfigured ? 'Guest · Create account' : 'Guest · Account setup')}</button> : <span className="workspace-status"><span className="status-dot"/>{t("Private workspace")}</span>}</div></header><main id="main-content" className="workspace-main">{children}</main><footer className="workspace-footer"><span>{t("Made for your next chapter.")}</span><span>{t("Forma")} <span className="brand-period">✦</span> {t("Thoughtful by design.")}</span></footer></div>
  </div>;
}
