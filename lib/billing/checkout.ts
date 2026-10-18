import 'server-only';
import { getAuthCallbackUrl } from '@/lib/env/server';
import { HttpError } from '@/lib/http';
import type { UserProfile } from '@/types';
import { RESUME_PRICES, type BillingCurrency, type ResumeLocale, type ResumeOrder, type ResumeSnapshot } from './catalog';
import { billingServices, databaseFailure, hasPaidOrder } from './server';
import { resumeFingerprint } from './validation';
import { fulfillCheckout } from './fulfillment';
import { checkoutParameters } from './checkout-parameters';

export async function createResumeCheckout(userId: string, profile: UserProfile, locale: ResumeLocale, currency: BillingCurrency) {
  const { admin, stripe, store } = billingServices();
  const fingerprint = resumeFingerprint(profile, locale);
  const { error: insertError } = await admin.from('resume_snapshots').upsert({ user_id: userId, profile, locale, fingerprint }, {
    onConflict: 'user_id,fingerprint', ignoreDuplicates: true,
  });
  if (insertError) databaseFailure(insertError);
  const { data: snapshotData, error: snapshotError } = await admin.from('resume_snapshots').select('*').eq('user_id', userId).eq('fingerprint', fingerprint).single();
  if (snapshotError || !snapshotData) databaseFailure(snapshotError);
  const snapshot = snapshotData as ResumeSnapshot;
  if (await hasPaidOrder(admin, userId, snapshot.id)) return { paid: true, resumeId: snapshot.id };

  // One order per immutable resume prevents simultaneous currency tabs from
  // charging twice. An open checkout keeps the original displayed Stripe price.
  const { error: orderInsertError } = await admin.from('resume_orders').upsert({
    user_id: userId, resume_id: snapshot.id, currency, amount: RESUME_PRICES[currency],
  }, { onConflict: 'resume_id', ignoreDuplicates: true });
  if (orderInsertError) databaseFailure(orderInsertError);
  const { data: orderData, error: orderError } = await admin.from('resume_orders').select('*').eq('resume_id', snapshot.id).eq('user_id', userId).single();
  if (orderError || !orderData) databaseFailure(orderError);
  let order = orderData as ResumeOrder;
  if (order.status === 'refunded' || order.status === 'disputed') throw new HttpError(409, 'This purchase was refunded or disputed. Contact support before purchasing this resume again.');
  if (order.status === 'paid') return { paid: true, resumeId: snapshot.id };

  if (order.checkout_session_id) {
    const session = await stripe.checkout.sessions.retrieve(order.checkout_session_id);
    if (session.payment_status === 'paid') return fulfillCheckout(session.id, stripe, store, userId);
    if (session.status === 'open' && session.url) {
      if (currency !== order.currency) throw new HttpError(409, 'A checkout for this CV is already open in another currency. Select that currency to continue.');
      return { url: session.url, resumeId: snapshot.id };
    }
    if (session.status !== 'expired') throw new HttpError(409, 'This payment is still processing. Please wait before trying again.');
    const { data: rotated, error: rotateError } = await admin.rpc('renew_resume_checkout', {
      target_order_id: order.id, expected_generation: order.generation, new_currency: currency, new_amount: RESUME_PRICES[currency],
    });
    if (rotateError || !rotated) databaseFailure(rotateError);
    order = (Array.isArray(rotated) ? rotated[0] : rotated) as ResumeOrder;
  }
  if (currency !== order.currency) throw new HttpError(409, 'A checkout for this CV is already open in another currency. Select that currency to continue.');
  const origin = new URL(getAuthCallbackUrl()).origin;
  const session = await stripe.checkout.sessions.create(checkoutParameters(order, locale, origin), { idempotencyKey: `resume-order-${order.id}-${order.generation}` });
  if (!session.url) throw new HttpError(502, 'Stripe could not open checkout. Please try again.');
  const { error: linkError } = await admin.from('resume_orders').update({ checkout_session_id: session.id })
    .eq('id', order.id).eq('generation', order.generation).is('checkout_session_id', null);
  if (linkError) databaseFailure(linkError);
  return { url: session.url, resumeId: snapshot.id };
}
