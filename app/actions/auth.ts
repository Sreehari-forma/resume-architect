'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { credentialsSchema } from '@/lib/schemas';
import { getAuthCallbackUrl } from '@/lib/env/server';
import { EnvironmentError } from '@/lib/env/validation';

type AuthResult = { error?: string; message?: string; rawError?: boolean };

export async function signIn(formData: FormData): Promise<AuthResult> {
  if (!hasSupabaseConfig()) return { error: 'Authentication is not configured. Keep editing as a guest or connect Supabase.' };
  const result = credentialsSchema.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!result.success) return { error: result.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);
  if (error) return { error: 'Unable to sign in. Check your credentials and confirm your email.' };
  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  if (!hasSupabaseConfig()) return { error: 'Authentication is not configured. Keep editing as a guest or connect Supabase.' };
  const result = credentialsSchema.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!result.success) return { error: result.error.issues[0].message };
  let callback: string;
  try { callback = getAuthCallbackUrl(); }
  catch (error) { return { error: error instanceof EnvironmentError ? error.message : 'NEXT_PUBLIC_APP_URL is not configured correctly.' }; }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ ...result.data, options: { emailRedirectTo: callback } });
  if (error) return { error: error.message, rawError: true };
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
