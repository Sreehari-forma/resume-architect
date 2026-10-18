import { assertSameOrigin, errorResponse, HttpError, readJson } from '@/lib/http';
import { checkoutRequestSchema } from '@/lib/billing/validation';
import { billingEnvironment, databaseFailure, privateJson, requireBillingUser } from '@/lib/billing/server';
import { createResumeCheckout } from '@/lib/billing/checkout';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user, supabase } = await requireBillingUser();
    billingEnvironment();
    const input = checkoutRequestSchema.safeParse(await readJson(request));
    if (!input.success) throw new HttpError(400, 'Review your resume, language and currency before checkout.');
    const { data: allowed, error } = await supabase.rpc('consume_checkout_rate_limit');
    if (error) databaseFailure(error);
    if (!allowed) throw new HttpError(429, 'Too many checkout requests. Please try again later.');
    const { profile, locale, currency } = input.data;
    return privateJson(await createResumeCheckout(user.id, profile, locale, currency));
  } catch (error) { return errorResponse(error); }
}
