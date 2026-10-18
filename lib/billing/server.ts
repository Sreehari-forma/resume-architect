import 'server-only';
import Stripe from 'stripe';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseConfig, supabaseConfig } from '@/lib/supabase/config';
import { optionalEnvironmentValue } from '@/lib/env/validation';
import { HttpError } from '@/lib/http';
import type { FulfillmentStore } from './fulfillment';
import type { ResumeOrder, ResumeSnapshot } from './catalog';

export function billingEnvironment() {
  const secretKey = optionalEnvironmentValue(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = optionalEnvironmentValue(process.env.STRIPE_WEBHOOK_SECRET);
  const serviceRoleKey = optionalEnvironmentValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!secretKey || !webhookSecret || !serviceRoleKey || !hasSupabaseConfig()) {
    throw new HttpError(503, 'Payments are not configured yet. Add the Stripe and Supabase server keys to enable final downloads.');
  }
  return { secretKey, webhookSecret, serviceRoleKey };
}

export function billingServices() {
  const environment = billingEnvironment();
  const stripe = new Stripe(environment.secretKey, { maxNetworkRetries: 2, timeout: 20000 });
  const admin = createSupabaseClient(supabaseConfig().url, environment.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  return { stripe, admin, webhookSecret: environment.webhookSecret, store: fulfillmentStore(admin) };
}

export async function requireBillingUser() {
  if (!hasSupabaseConfig()) throw new HttpError(503, 'Connect Supabase to create an account and purchase a final PDF.');
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new HttpError(401, 'Sign in to purchase or download a final CV.');
  return { user, supabase };
}

export function databaseFailure(error: unknown): never {
  // Do not expose SQL, keys, or provider internals in public responses.
  void error;
  throw new HttpError(503, 'Payments are temporarily unavailable. Check that the Supabase payment migration has been applied.');
}

export function fulfillmentStore(admin: SupabaseClient): FulfillmentStore {
  return {
    async findOrder(id) {
      const { data, error } = await admin.from('resume_orders').select('*').eq('id', id).maybeSingle();
      if (error) databaseFailure(error);
      return data as ResumeOrder | null;
    },
    async recordPayment(orderId, sessionId, paymentIntentId, generation) {
      const { data, error } = await admin.rpc('fulfill_resume_order', {
        target_order_id: orderId, stripe_session_id: sessionId, stripe_payment_intent_id: paymentIntentId, expected_generation: generation,
      });
      if (error) databaseFailure(error);
      return data === true;
    },
    async revokePayment(orderId, paymentIntentId, reason) {
      const { error } = await admin.rpc('revoke_resume_order', {
        target_order_id: orderId, stripe_payment_intent_id: paymentIntentId, reversal_status: reason,
      });
      if (error) databaseFailure(error);
    },
  };
}

export async function hasPaidOrder(admin: SupabaseClient, userId: string, resumeId: string): Promise<boolean> {
  const { data, error } = await admin.from('resume_orders').select('id').eq('user_id', userId).eq('resume_id', resumeId).eq('status', 'paid').limit(1);
  if (error) databaseFailure(error);
  return Boolean(data?.length);
}

export async function findOwnedSnapshot(admin: SupabaseClient, userId: string, resumeId: string): Promise<ResumeSnapshot | null> {
  const { data, error } = await admin.from('resume_snapshots').select('*').eq('id', resumeId).eq('user_id', userId).maybeSingle();
  if (error) databaseFailure(error);
  return data as ResumeSnapshot | null;
}

export function privateJson(value: unknown): Response {
  return Response.json(value, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
}
