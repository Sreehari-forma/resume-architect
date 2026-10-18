import 'server-only';
import type Stripe from 'stripe';
import type { ResumeLocale, ResumeOrder } from './catalog';

/** Keep Checkout pricing independent of account-wide localization settings. */
export function checkoutParameters(order: ResumeOrder, locale: ResumeLocale, origin: string): Stripe.Checkout.SessionCreateParams {
  const metadata = { order_id: order.id, resume_id: order.resume_id, user_id: order.user_id, generation: String(order.generation) };
  return {
    mode: 'payment', allowed_payment_method_types: ['card'], client_reference_id: order.user_id,
    adaptive_pricing: { enabled: false },
    locale: locale === 'pl' ? 'pl' : 'en', metadata, payment_intent_data: { metadata },
    line_items: [{ quantity: 1, price_data: {
      currency: order.currency, unit_amount: order.amount,
      product_data: { name: locale === 'pl' ? 'forma — CV bez znaku wodnego' : 'forma — watermark-free CV', description: locale === 'pl' ? 'Jednorazowy zakup pliku PDF dla tej wersji CV.' : 'One-time PDF purchase for this version of your resume.' },
    } }],
    allow_promotion_codes: false,
    success_url: `${origin}/studio?checkout_session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/studio?payment=cancelled`,
  };
}
