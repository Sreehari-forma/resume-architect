import 'server-only';
import type Stripe from 'stripe';
import { HttpError } from '@/lib/http';

export function verifyWebhook(rawBody: string, signature: string | null, secret: string, stripe: Stripe): Stripe.Event {
  if (!signature) throw new HttpError(400, 'The Stripe signature is missing.');
  try { return stripe.webhooks.constructEvent(rawBody, signature, secret); }
  catch { throw new HttpError(400, 'The Stripe signature is invalid.'); }
}
