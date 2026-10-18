import LoginContent from '@/components/LoginContent';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import '../profile.css';

export const metadata = { title: 'Your next chapter' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const initialError = params.error === 'confirmation' ? 'The confirmation link is invalid or expired. Sign in if already confirmed, or request a new confirmation by signing up again.' : undefined;
  return <LoginContent configured={hasSupabaseConfig()} initialError={initialError} />;
}
