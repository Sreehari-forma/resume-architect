import Link from 'next/link';
import { ArrowLeft, Check, FileText, Blocks, Sparkles } from 'lucide-react';
import { AuthForm } from '@/components/AuthForm';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import '../profile.css';

export const metadata = { title: 'Your next chapter' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const initialError = params.error === 'confirmation' ? 'The confirmation link is invalid or expired. Sign in if already confirmed, or request a new confirmation by signing up again.' : undefined;
  const configured = hasSupabaseConfig();
  return <main id="main-content" className="auth-page"><section className="auth-story"><Link href="/" className="auth-brand" aria-label="Forma home"><span className="auth-brand-mark"><Blocks size={23} strokeWidth={1.6} /></span><span>forma<span className="auth-brand-period">.</span><small>RESUME ARCHITECT</small></span></Link><div className="auth-story-content"><span className="eyebrow">A BETTER WAY FORWARD</span><h1>Your experience.<br />Its best expression.</h1><p>You bring the story. We help you shape it into a resume that opens the next door.</p><div className="auth-resume-card"><div className="auth-resume-card-header"><span className="auth-document-icon"><FileText size={22} /></span><div><strong>Your next chapter</strong><span>Built on your real experience</span></div><Sparkles size={17} /></div><div className="auth-resume-rule" /><div className="auth-resume-lines"><i /><i /><i /></div><div className="auth-resume-tags"><span><Check size={12} /> ATS-friendly</span><span><Check size={12} /> Authentically you</span></div></div><div className="auth-story-features"><span><Check size={14} /> One profile, every opportunity</span><span><Check size={14} /> Beautiful resumes. Clean LaTeX.</span></div></div><p className="auth-story-footer">A little more clarity. A lot more possibility.</p></section><section className="auth-form-side"><Link href="/" className="auth-back"><ArrowLeft size={15} /> Back to home</Link><AuthForm configured={configured} initialError={initialError} /><p className="auth-form-footer">Built for your career. Designed around you.</p></section></main>;
}
