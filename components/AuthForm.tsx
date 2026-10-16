'use client';

import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Info, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { signIn, signUp } from '@/app/actions/auth';

export function AuthForm({ configured, initialError }: { configured: boolean; initialError?: string }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; message?: string } | null>(initialError ? { error: initialError } : null);
  const signup = mode === 'signup';

  return <div className="auth-form-container"><div className="auth-welcome-icon"><LockKeyhole size={23} /></div><div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div><h2>{signup ? 'Make room for possibility.' : 'Good to have you back.'}</h2><p className="auth-description">{signup ? 'Create your account and turn your experience into opportunity.' : 'Sign in to your workspace. Your next opportunity is waiting.'}</p>
    {!configured && <div className="auth-config-notice"><Info size={19} /><div><strong>Explore Forma in demo mode</strong><p>Account access needs Supabase configuration. You can explore the studio now with a sample profile saved in this browser.</p><Link href="/studio" className="auth-demo-link">Enter demo workspace <ArrowRight size={14} /></Link></div></div>}
    <div className="auth-mode-switch" role="group" aria-label="Account access"><button type="button" aria-pressed={!signup} className={!signup ? 'is-active' : ''} onClick={() => { setMode('signin'); setResult(null); }}>Sign in</button><button type="button" aria-pressed={signup} className={signup ? 'is-active' : ''} onClick={() => { setMode('signup'); setResult(null); }}>Create account</button></div>
    <form className="auth-form" onSubmit={event => { event.preventDefault(); if (!configured) return; const data = new FormData(event.currentTarget); setResult(null); startTransition(async () => { try { const response = await (signup ? signUp(data) : signIn(data)); if (response) setResult(response); } catch (error) { unstable_rethrow(error); setResult({ error: 'We could not reach the account service. Please try again.' }); } }); }}>
      <label className="field" htmlFor="auth-email"><span className="label">Email address</span><input id="auth-email" className="input" type="email" name="email" autoComplete="email" placeholder="you@example.com" required disabled={!configured || pending} /></label>
      <label className="field" htmlFor="auth-password"><span className="label">Password</span><span className="auth-password-field"><input id="auth-password" className="input" type={showPassword ? 'text' : 'password'} name="password" minLength={signup ? 8 : undefined} autoComplete={signup ? 'new-password' : 'current-password'} placeholder={signup ? 'Create a secure password' : 'Enter your password'} required disabled={!configured || pending} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} disabled={!configured}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>{signup && <span className="profile-field-hint">Use at least 8 characters.</span>}</label>
      {result && <div className={`auth-result ${result.error ? 'auth-result-error' : 'auth-result-success'}`} role={result.error ? 'alert' : 'status'}>{result.error ? <Info size={17} /> : <CheckCircle2 size={17} />}<span>{result.error || result.message}</span></div>}
      <button className="button button-primary auth-submit" type="submit" disabled={!configured || pending}>{pending ? <><Loader2 size={17} className="profile-spin" />{signup ? 'Creating account…' : 'Signing in…'}</> : <>{signup ? 'Create your account' : 'Sign in to Forma'}<ArrowRight size={17} /></>}</button>
    </form>
    <p className="auth-secure"><ShieldCheck size={14} /> Secure account access powered by Supabase</p>
    {configured && <p className="auth-switch-note">{signup ? 'Already have an account?' : 'New to Forma?'} <button type="button" onClick={() => { setMode(signup ? 'signin' : 'signup'); setResult(null); }}>{signup ? 'Sign in' : 'Create an account'}</button></p>}
  </div>;
}
