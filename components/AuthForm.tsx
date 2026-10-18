'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { formatAuthResult } from '@/lib/i18n/translate';
import { unstable_rethrow } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Info, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { signIn, signUp } from '@/app/actions/auth';
import { draftBelongsToEmail, prepareGuestDraftForAuth, readGuestDraft } from '@/lib/guest-draft';

export function AuthForm({ configured, initialError, initialMode = 'signin' }: { configured: boolean; initialError?: string; initialMode?: 'signin' | 'signup' }) {
  const {t,locale}=useI18n();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [differentDraftAccount, setDifferentDraftAccount] = useState(false);
  const [transferDraft, setTransferDraft] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; message?: string; rawError?: boolean } | null>(initialError ? { error: initialError } : null);
  const signup = mode === 'signup';

  return <div className="auth-form-container"><div className="auth-welcome-icon"><LockKeyhole size={23} /></div><div className="eyebrow">{t("YOUR NEXT CHAPTER STARTS HERE")}</div><h2>{t(signup ? 'Make room for possibility.' : 'Good to have you back.')}</h2><p className="auth-description">{t(signup ? 'Create your account and turn your experience into opportunity.' : 'Sign in to your workspace. Your next opportunity is waiting.')}</p>
    {!configured && <div className="auth-config-notice"><Info size={19} /><div><strong>{t("Keep building as a guest")}</strong><p>{t("Account access needs Supabase configuration. Your CV stays in this browser while you edit. Draft saving and watermarked demo downloads are free; clean final downloads require an account and payment.")}</p><Link href="/dashboard" className="auth-demo-link">{t("Open guest builder")} <ArrowRight size={14} /></Link></div></div>}
    <div className="auth-mode-switch" role="group" aria-label={t("Account access")}><button type="button" aria-pressed={!signup} className={!signup ? 'is-active' : ''} onClick={() => { setMode('signin'); setResult(null); }}>{t("Sign in")}</button><button type="button" aria-pressed={signup} className={signup ? 'is-active' : ''} onClick={() => { setMode('signup'); setResult(null); }}>{t("Create account")}</button></div>
    <form className="auth-form" onSubmit={event => { event.preventDefault(); if (!configured) return; const data = new FormData(event.currentTarget); if (!prepareGuestDraftForAuth(String(data.get('email') ?? ''), undefined, transferDraft)) { setResult({ error: 'Your CV could not be preserved in browser storage. Keep this tab open and enable storage before signing in.' }); return; } setResult(null); startTransition(async () => { try { const response = await (signup ? signUp(data) : signIn(data)); if (response) setResult(response); } catch (error) { unstable_rethrow(error); setResult({ error: 'We could not reach the account service. Please try again.' }); } }); }}>
      <label className="field" htmlFor="auth-email"><span className="label">{t("Email address")}</span><input id="auth-email" className="input" type="email" name="email" autoComplete="email" placeholder={t("you@example.com")} required disabled={!configured || pending} onChange={event => { const draft = readGuestDraft(); setDifferentDraftAccount(Boolean(draft?.intent?.email && !draftBelongsToEmail(draft, event.target.value))); setTransferDraft(false); }} /></label>
      {differentDraftAccount && <label className="profile-field-hint"><input type="checkbox" checked={transferDraft} onChange={event => setTransferDraft(event.target.checked)} disabled={pending} /> {t("Transfer this browser CV to this account. Leave unchecked to keep it linked to the previous sign-in.")}</label>}
      <label className="field" htmlFor="auth-password"><span className="label">{t("Password")}</span><span className="auth-password-field"><input id="auth-password" className="input" type={showPassword ? 'text' : 'password'} name="password" minLength={signup ? 8 : undefined} autoComplete={signup ? 'new-password' : 'current-password'} placeholder={t(signup ? 'Create a secure password' : 'Enter your password')} required disabled={!configured || pending} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={t(showPassword ? 'Hide password' : 'Show password')} disabled={!configured}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>{signup && <span className="profile-field-hint">{t("Use at least 8 characters.")}</span>}</label>
      {result && <div className={`auth-result ${result.error ? 'auth-result-error' : 'auth-result-success'}`} role={result.error ? 'alert' : 'status'}>{result.error ? <Info size={17} /> : <CheckCircle2 size={17} />}<span>{formatAuthResult(locale, result)}</span></div>}
      <button className="button button-primary auth-submit" type="submit" disabled={!configured || pending}>{pending ? <><Loader2 size={17} className="profile-spin" />{t(signup ? 'Creating account…' : 'Signing in…')}</> : <>{t(signup ? 'Create your account' : 'Sign in to Forma')}<ArrowRight size={17} /></>}</button>
    </form>
    <p className="auth-secure"><ShieldCheck size={14} /> {t("Secure account access powered by Supabase")}</p>
    {configured && <p className="auth-switch-note">{t(signup ? 'Already have an account?' : 'New to Forma?')} <button type="button" onClick={() => { setMode(signup ? 'signin' : 'signup'); setResult(null); }}>{t(signup ? 'Sign in' : 'Create an account')}</button></p>}
  </div>;
}
