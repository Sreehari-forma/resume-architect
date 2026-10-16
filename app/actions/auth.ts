'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { credentialsSchema } from '@/lib/schemas';

type AuthResult = { error?: string; message?: string };

export async function signIn(formData: FormData): Promise<AuthResult> {
  if (!hasSupabaseConfig()) return { error: 'Authentication is not configured. Open the demo workspace or connect Supabase.' };
  const result = credentialsSchema.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!result.success) return { error: result.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);
  if (error) return { error: 'Unable to sign in. Check your credentials and confirm your email.' };
  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  if (!hasSupabaseConfig()) return { error: 'Authentication is not configured. Open the demo workspace or connect Supabase.' };
  const result = credentialsSchema.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!result.success) return { error: result.error.issues[0].message };
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredUrl) return { error: 'Set NEXT_PUBLIC_APP_URL to the exact browser origin before creating accounts.' };
  let callback: URL;
  try {
    callback = new URL('/auth/callback', configuredUrl);
    if (callback.username || callback.password || (callback.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(callback.hostname))) throw new Error();
  } catch { return { error: 'The application URL is not configured correctly. Please contact support.' }; }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ ...result.data, options: { emailRedirectTo: callback.href } });
  if (error) return { error: 'We could not create your account. Try again shortly or use an existing account.' };
  if (data.session) { revalidatePath('/', 'layout'); redirect('/dashboard'); }
  return { message: 'Check your inbox for a confirmation link, then sign in to your workspace.' };
}

export async function signOut(): Promise<void> {
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error('Unable to sign out. Please try again.');
  }
  revalidatePath('/', 'layout');
  redirect('/');
}
