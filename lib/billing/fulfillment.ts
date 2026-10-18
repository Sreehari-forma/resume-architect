import 'server-only';
import type Stripe from 'stripe';
import { HttpError } from '@/lib/http';
import { RESUME_PRICES, type ResumeOrder } from './catalog';

export interface FulfillmentStore {
  findOrder(id: string): Promise<ResumeOrder | null>;
  recordPayment(orderId: string, sessionId: string, paymentIntentId: string, generation: number): Promise<boolean>;
  revokePayment(orderId: string, paymentIntentId: string, reason: 'refunded' | 'disputed'): Promise<void>;
}

export interface PaymentProvider {
  checkout: { sessions: { retrieve(id: string): Promise<Stripe.Checkout.Session> } };
  paymentIntents: { retrieve(id: string): Promise<Stripe.PaymentIntent> };
  charges: { retrieve(id: string): Promise<Stripe.Charge> };
}

export function objectId(value: string | { id: string } | null): string | null {
  return typeof value === 'string' ? value : value?.id || null;
}

export function verifySessionOrder(session: Stripe.Checkout.Session, order: ResumeOrder, ownerId?: string): void {
  const metadata = session.metadata;
  if ((ownerId && order.user_id !== ownerId) || session.client_reference_id !== order.user_id
      || metadata?.order_id !== order.id || metadata?.resume_id !== order.resume_id
      || metadata?.user_id !== order.user_id || metadata?.generation !== String(order.generation)
      || (order.checkout_session_id && session.id !== order.checkout_session_id)
      || session.mode !== 'payment' || session.currency !== order.currency
      || session.amount_total !== order.amount || order.amount !== RESUME_PRICES[order.currency]) {
    throw new HttpError(403, 'This payment does not match the resume purchase.');
  }
}

function verifyIntentOrder(intent: Stripe.PaymentIntent, order: ResumeOrder): void {
  if (intent.metadata.order_id !== order.id || intent.metadata.resume_id !== order.resume_id
      || intent.metadata.user_id !== order.user_id || intent.currency !== order.currency
      || intent.amount !== order.amount || (order.payment_intent_id && intent.id !== order.payment_intent_id)) {
    throw new HttpError(403, 'This payment does not match the resume purchase.');
  }
}

/** Both webhook and return-page verification use this same repeatable operation. */
export async function fulfillCheckout(sessionId: string, provider: PaymentProvider, store: FulfillmentStore, ownerId?: string) {
  const session = await provider.checkout.sessions.retrieve(sessionId);
  const orderId = session.metadata?.order_id;
  if (!orderId) throw new HttpError(404, 'This checkout does not belong to a resume purchase.');
  const order = await store.findOrder(orderId);
  if (!order) throw new HttpError(404, 'The resume purchase was not found.');
  verifySessionOrder(session, order, ownerId);
  if (order.status === 'refunded' || order.status === 'disputed') return { paid: false };
  if (session.payment_status !== 'paid' || session.status !== 'complete') return { paid: false };
  const paymentIntentId = objectId(session.payment_intent);
  if (!paymentIntentId) throw new HttpError(409, 'Payment verification is still in progress.');
  const intent = await provider.paymentIntents.retrieve(paymentIntentId);
  verifyIntentOrder(intent, order);
  if (intent.status !== 'succeeded' || intent.amount_received !== order.amount) return { paid: false };
  const chargeId = objectId(intent.latest_charge);
  if (!chargeId) throw new HttpError(409, 'Payment verification is still in progress.');
  const charge = await provider.charges.retrieve(chargeId);
  if (objectId(charge.payment_intent) !== intent.id || !charge.paid || charge.currency !== order.currency || charge.amount !== order.amount) {
    throw new HttpError(403, 'This charge does not match the resume purchase.');
  }
  if (charge.refunded || charge.amount_refunded > 0 || charge.disputed) {
    await store.revokePayment(order.id, intent.id, charge.disputed ? 'disputed' : 'refunded');
    return { paid: false };
  }
  const paid = await store.recordPayment(order.id, session.id, intent.id, order.generation);
  return paid ? { paid: true, resumeId: order.resume_id } : { paid: false };
}

/** Signed reversal events can arrive before checkout completion; revocation wins. */
export async function revokeIntent(paymentIntentId: string, reason: 'refunded' | 'disputed', provider: PaymentProvider, store: FulfillmentStore): Promise<void> {
  const intent = await provider.paymentIntents.retrieve(paymentIntentId);
  const orderId = intent.metadata.order_id;
  if (!orderId) return; // Other Stripe products can share this webhook endpoint.
  const order = await store.findOrder(orderId);
  if (!order) return;
  verifyIntentOrder(intent, order);
  await store.revokePayment(order.id, intent.id, reason);
}
