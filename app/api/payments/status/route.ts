import { errorResponse, HttpError } from '@/lib/http';
import { sessionIdSchema } from '@/lib/billing/validation';
import { billingServices, privateJson, requireBillingUser } from '@/lib/billing/server';
import { fulfillCheckout } from '@/lib/billing/fulfillment';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const { user } = await requireBillingUser();
    const sessionId = sessionIdSchema.safeParse(new URL(request.url).searchParams.get('session_id'));
    if (!sessionId.success) throw new HttpError(400, 'The checkout session is invalid.');
    const { stripe, store } = billingServices();
    return privateJson(await fulfillCheckout(sessionId.data, stripe, store, user.id));
  } catch (error) { return errorResponse(error); }
}
