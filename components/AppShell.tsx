'use client';

import Link from 'next/link';
import { ArrowUpRight, Blocks, ChevronRight, CircleHelp, FileText, Fingerprint, LogOut, Sparkles, Vault } from 'lucide-react';
import { useWorkspace } from '@/lib/store';
import { signOut } from '@/app/actions/auth';
import { profileCompleteness } from '@/lib/demo';

export default function AppShell({ children, active }: {children: React.ReactNode; active: 'dashboard' | 'studio'}) {
  const { profile, isGuest, authConfigured, draftStorageError, requestAuth, userEmail } = useWorkspace();
  const completeness = profileCompleteness(profile);
  const initials = profile.fullName.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('') || 'Y';
  return <div className="workspace-shell">
    <aside className="workspace-sidebar">
      <Link href="/" className="brand" aria-label="Forma home"><span className="brand-icon"><Blocks size={23} strokeWidth={1.6}/></span><span>forma<span className="brand-period">.</span><small>RESUME ARCHITECT</small></span></Link>
      <div className="sidebar-group"><p className="sidebar-label">YOUR WORKSPACE</p><nav aria-label="Workspace"><Link className={`sidebar-link ${active === 'dashboard' ? 'active' : ''}`} aria-current={active === 'dashboard' ? 'page' : undefined} href="/dashboard"><Vault size={18}/>Master Vault<span className="nav-complete">{completeness}%</span></Link><Link className={`sidebar-link ${active === 'studio' ? 'active' : ''}`} aria-current={active === 'studio' ? 'page' : undefined} href="/studio"><Sparkles size={18}/>Tailoring Studio<ChevronRight size={14} className="nav-chevron"/></Link></nav></div>
      <div className="sidebar-journey"><span className="sidebar-label">A LITTLE MORE INTENTIONAL</span><div><span className="journey-point"><Fingerprint size={14}/></span><p>Your experience<small>A single source of truth</small></p></div><div><span className="journey-point"><Sparkles size={14}/></span><p>Your next opportunity<small>A more focused story</small></p></div><div><span className="journey-point"><FileText size={14}/></span><p>Your next chapter<small>Ready to make an impression</small></p></div></div>
      <div className="sidebar-bottom">{isGuest && <div className="demo-note"><span className="status-dot"/><strong>Your guest workspace.</strong><p>{draftStorageError ? 'Browser storage is unavailable. Keep this page open to retain your draft.' : 'Your draft is kept in this browser as you edit.'} {authConfigured ? 'Create an account to save your CV and export a resume.' : 'Account saving and exports need setup on this installation. You can keep editing.'}</p><button type="button" className="button button-ghost" style={{ width: '100%', minHeight: 32, padding: '7px 0', fontSize: 10, justifyContent: 'space-between' }} onClick={() => requestAuth('save')}>{authConfigured ? 'Create an account' : 'Account setup'} <ArrowUpRight size={13}/></button></div>}<Link href="/#faq" className="sidebar-help"><CircleHelp size={16}/>A little guidance<ArrowUpRight size={14}/></Link><div className="sidebar-person"><span className="avatar">{initials}</span><div><strong>{profile.fullName || 'Your workspace'}</strong><small>{isGuest ? 'Guest · not saved to an account' : userEmail}</small></div>{!isGuest && <form action={signOut}><button className="icon-button" title="Sign out" aria-label="Sign out"><LogOut size={16}/></button></form>}</div></div>
    </aside>
    <div className="workspace-body"><header className="workspace-topbar"><div><span>Workspace</span><ChevronRight size={13}/><strong>{active === 'studio' ? 'Tailoring Studio' : 'Master Vault'}</strong></div>{isGuest ? <button type="button" className="workspace-status" style={{ background: 'transparent', border: 0, padding: '4px 0', minHeight: 32 }} onClick={() => requestAuth('save')}><span className="status-dot"/>{authConfigured ? 'Guest · Create account' : 'Guest · Account setup'}</button> : <span className="workspace-status"><span className="status-dot"/>Private workspace</span>}</header><main id="main-content" className="workspace-main">{children}</main><footer className="workspace-footer"><span>Made for your next chapter.</span><span>Forma <span className="brand-period">✦</span> Thoughtful by design.</span></footer></div>
  </div>;
}
