# Enable paid CV downloads

Guest editing, local draft saving, EN/PL switching, and watermarked demo PDF exports work without payment configuration. Final PDFs require an authenticated account and a verified purchase of that exact resume version. The language and validated resume content define the version; later edits do not alter a purchased snapshot.

## Production setup

1. In the Supabase SQL editor, apply `supabase/schema.sql` if not already installed, then apply `supabase/payment-schema.sql`. The latter creates immutable resume snapshots, owner-readable orders, server-only fulfillment functions, and the checkout quota. Browser roles cannot create or change payment entitlements.
2. In Vercel **Project Settings → Environment Variables**, add these **server-only** secrets for the intended environment:

   | Name | Source |
   | --- | --- |
   | `STRIPE_SECRET_KEY` | Stripe Dashboard API keys; use a test secret first |
   | `STRIPE_WEBHOOK_SECRET` | Signing secret for the webhook endpoint below |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase server/service-role key for the same project as the public URL |

   Never prefix these keys with `NEXT_PUBLIC_`. Keep the existing Supabase public settings, Gemini key, and `NEXT_PUBLIC_APP_URL=https://resume-architect-seven.vercel.app`. No Stripe publishable key or predefined Stripe Price IDs are needed: the server creates hosted Checkout sessions with the fixed price catalog.
3. Create a Stripe webhook endpoint at `https://resume-architect-seven.vercel.app/api/payments/webhook`. Subscribe to:

   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `charge.refunded`
   - `charge.dispute.created`

   Copy that endpoint's signing secret into Vercel. Use separate endpoints and secrets for Stripe test and live modes. [Stripe webhook setup](https://docs.stripe.com/webhooks)
4. Redeploy after setting the keys. The application has been pushed to `main`; a connected Vercel Git integration builds automatically. Missing payment configuration deliberately leaves free features available and returns an actionable setup error for checkout.

## Prices and fulfillment

Each immutable CV version costs **5 PLN**, **USD 1.25**, or **EUR 1.15**, selected explicitly in checkout. These are fixed local prices, not live currency conversion. The server enforces the amount in minor units (500/125/115), currency, account ID, snapshot ID, and order generation. An open checkout retains its selected currency; choose the same currency to resume it. After Stripe expires it, a new session may select another currency. Requests for the same order use Stripe idempotency keys to prevent duplicate checkout creation.

A success query parameter never grants access. The signed webhook and authenticated return-page endpoint use the same fulfillment function: retrieve the Stripe session, payment intent and charge, verify paid status and exact order details, then atomically record payment. Repeated notifications are safe. Refunds and disputes revoke access; a delayed completion event cannot undo a revocation. [Stripe fulfillment guidance](https://docs.stripe.com/checkout/fulfillment)

Clean PDF requests re-check the signed-in owner and persisted paid order. The PDF is rendered from the immutable server snapshot, not client-supplied content or a browser `paid` flag. The public demo route accepts no watermark override and always marks every PDF page. Raw CV text/LaTeX remains visible to its author; the payment entitlement governs the application's final PDF download.

## Local and test-mode verification

Use one consistent local origin, e.g. `NEXT_PUBLIC_APP_URL=http://localhost:3000`, and configure the matching Supabase auth callback. Never mix `localhost` with `127.0.0.1` during a session. Keep the production `.env.example` origin unchanged when configuring Vercel.

With Stripe CLI installed, forward test events:

```sh
stripe listen --forward-to http://localhost:3000/api/payments/webhook
```

Use the CLI's displayed signing secret locally; it differs from the Dashboard endpoint secret. Run the app with the same hostname. Build a guest CV, save the draft, download the watermarked demo, then create/sign in to an account and select **Download Final CV**. Complete Checkout using [Stripe's documented test payment methods](https://docs.stripe.com/testing), return to the studio, and verify the clean PDF and Polish text. Verify cancellation, a failed payment, duplicate webhook delivery, a refund, and a request from another account. No real payment is required for these test-mode checks.

`npm test` covers exact pricing, session/intent/charge verification, signatures, duplicate fulfillment, reversal races, draft recovery, localization, and forced-watermark PDF rendering. It does not create a live Stripe account, apply SQL remotely, or execute an actual payment. Add the secrets, apply SQL, and complete the test-mode workflow before enabling live keys.
