import { errorResponse, readBoundedText } from '@/lib/http';
import { billingServices, privateJson } from '@/lib/billing/server';
import { fulfillCheckout, objectId, revokeIntent } from '@/lib/billing/fulfillment';
import { verifyWebhook } from '@/lib/billing/webhook';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { stripe, store, webhookSecret } = billingServices();
    const signature = request.headers.get('stripe-signature');
    const rawBody = await readBoundedText(request, 512000);
    const event = verifyWebhook(rawBody, signature, webhookSecret, stripe);
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object;
      if (session.metadata?.order_id) await fulfillCheckout(session.id, stripe, store);
    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object;
      const intentId = objectId(charge.payment_intent);
      if (intentId && charge.amount_refunded > 0) await revokeIntent(intentId, 'refunded', stripe, store);
    } else if (event.type === 'charge.dispute.created') {
      const intentId = objectId(event.data.object.payment_intent);
      if (intentId) await revokeIntent(intentId, 'disputed', stripe, store);
    }
    return privateJson({ received: true });
  } catch (error) { return errorResponse(error); }
}
