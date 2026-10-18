# Deploy to Vercel

## Project settings

- Framework Preset: **Next.js**.
- Root Directory: **`./`** when importing this repository. If importing a parent repository instead, select the folder containing this application's `package.json`.
- Install Command: **`npm ci`** to use the committed lockfile, including development dependencies used during the build.
- Build Command: **`npm run build`** (`next build`).
- Output Directory: leave the Next.js default; do not select a static export directory.
- Node.js: **24.x**, also declared in `package.json`.

`npm run lint` runs the Next.js Core Web Vitals and TypeScript rules with zero warnings allowed. Next.js 15 also runs ESLint and TypeScript checks during `next build`; neither check is disabled.

## Environment variables

Add these in Vercel **Settings → Environment Variables**, scoped to **Production**, before deploying. `.env.local` is for local development and is not committed or uploaded by this project.

| Variable | Production value | Access |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase HTTPS project URL | Browser and server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key | Browser and server; protected by database RLS |
| `NEXT_PUBLIC_APP_URL` | `https://resume-architect-seven.vercel.app`, without a trailing slash, path, query, or fragment | Public configuration; used by API origin checks and signup redirects |
| `GEMINI_API_KEY` | Gemini key from Google AI Studio | Server only |
| `GEMINI_MODEL` | Optional; defaults to `gemini-3.8-flash` | Server only |
| `STRIPE_SECRET_KEY` | Stripe secret API key; test mode first, live mode when ready | Server only; required for paid downloads |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this environment's `/api/payments/webhook` endpoint | Server only; required for paid downloads |
| `SUPABASE_SERVICE_ROLE_KEY` | Server/service-role key for the same Supabase project | Server only; payment snapshots and verified entitlements |

The optional `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` can replace the anon key and takes precedence when both are present. Never use a Supabase service-role key in either public key field.

Public variables use explicit `process.env.NEXT_PUBLIC_*` references so Next.js can embed them at build time. Redeploy after changing them. Gemini configuration lives behind a `server-only` module and is never placed in `next.config.ts`'s `env` option or passed to client components. Stripe and Supabase service-role secrets are also read only in server-only payment modules; no Stripe publishable key is required for hosted Checkout. Raw environment types remain optional; runtime helpers validate and narrow them before use. [Next.js environment variable behavior](https://nextjs.org/docs/15/app/guides/environment-variables)

When Vercel sets `VERCEL_ENV=production`, configuration validation stops the build if a required setting is missing or a URL is invalid. Errors identify setting names without printing their values. Local builds retain the credential-free demo; missing or partial local Supabase credentials do not initialize a client. Payment keys are checked when payment routes run, rather than being mandatory for the build: free guest editing and watermarked PDF downloads remain available when checkout is not configured. Missing checkout configuration returns a setup error and preserves the draft.

The shared server resolver prefers `NEXT_PUBLIC_APP_URL`. If it is blank, production uses `VERCEL_PROJECT_PRODUCTION_URL`, then `VERCEL_URL`; previews use only `VERCEL_URL` so authentication stays on the preview host. Vercel hostnames receive an HTTPS scheme exactly once. Malformed explicit values cause a setup error rather than being silently replaced. With no configured or Vercel origin, only local development uses `http://127.0.0.1:3000` for signup callbacks; production never falls back to localhost. Enable access to Vercel System Environment Variables if relying on these fallbacks. [Vercel system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables)

The `.env.example` template targets the production origin above; `.env.local` remains an uncommitted local configuration file. In Vercel's environment-variable editor, enter the URL itself without literal quotation marks or a newline. Dotenv file quotes are syntax and are removed by Next.js. For local auth/API testing, set the local file to `http://127.0.0.1:3000` or `http://localhost:3000` and restart, using that exact origin consistently; otherwise local requests intentionally do not match the production origin.

Set `NEXT_PUBLIC_APP_URL` to the domain people will actually open. Redirect alternate production domains to that canonical origin. A deployment visited on a different hostname will fail the application's same-origin API checks. For an authenticated Preview deployment, scope a matching origin and Supabase project/key to Preview and allow that preview callback in Supabase. For a demo Preview, leave the service credentials blank. Do not reuse the production origin for an authenticated preview.

## Supabase setup

1. Run `supabase/schema.sql` in the target project's SQL editor. It installs the profile/resume tables, owner-only RLS policies, and shared request quota function. Then run `supabase/payment-schema.sql` to install immutable resume snapshots, payment orders, fulfillment/revocation functions, and checkout quotas. Browser roles cannot grant paid entitlements.
2. Set Supabase **Authentication → URL Configuration → Site URL** to the same canonical origin as `NEXT_PUBLIC_APP_URL`.
3. Allow the exact redirect URL `https://resume-architect-seven.vercel.app/auth/callback`. Add separate exact callbacks for authenticated preview domains when needed.
4. Enable email/password authentication and configure production email delivery if confirmation is enabled. This repository has no `supabase/config.toml`; the hosted Supabase dashboard controls confirmation. With confirmation disabled, signup can return a session immediately. With confirmation enabled, open the link on the same browser and origin to preserve the guest-draft handoff.

After deploying, start as a guest, edit and **Save draft** without login, switch EN/PL, and download a watermarked demo PDF. Create/sign in to an account through **Download Final CV**, confirm that the draft imports, and generate a tailored resume. Live generation requires an authenticated Supabase session, the base migration, and available Gemini quota. Verify a final PDF purchase using Stripe test mode before enabling live payments.

The signup confirmation URL is built with `new URL('/auth/callback', origin)`. After the PKCE code exchange, the callback redirects to fixed relative paths (`/dashboard` or `/login?error=confirmation`) to preserve the host that received the session cookies. Sign-in/sign-out also use fixed relative paths; none accepts an untrusted `next` destination or forwarded host as a redirect target.

Changing local dotenv files does not change Vercel's project environment or Supabase's URL allowlist. Set the production `NEXT_PUBLIC_APP_URL` in Vercel and the Site URL/callback above in Supabase. Deploy the updated source after those values are saved. If using an installed Vercel CLI, first link this directory to the existing project, then run `vercel deploy --prod`; avoid redeploying an older source snapshot. [Vercel deploy](https://vercel.com/docs/cli/deploy)

## Stripe Checkout setup

Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY` in Vercel for the intended deployment environment. Keep all three server-only, use distinct Stripe test/live secrets, and run `supabase/payment-schema.sql` before opening checkout. The authenticated user's session still controls ordinary profile and AI-resume access; the service-role client is reserved for payment operations.

Create a Stripe webhook endpoint at `https://resume-architect-seven.vercel.app/api/payments/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, and `charge.dispute.created`. Save its signing secret in Vercel, then redeploy. No predefined Stripe Price IDs are required: the server defines one-time prices of **5 PLN**, **USD 1.25**, and **EUR 1.15**. These are fixed local prices, not dynamic conversions.

A successful return URL alone does not unlock anything. The backend verifies Stripe payment details and ownership, persists the paid entitlement, and serves the clean PDF from an immutable profile/language snapshot. Editing the CV or changing the PDF language creates a different version. Refunds and disputes revoke access. Guest drafts and watermarked PDFs remain free.

Follow [PAYMENTS.md](./PAYMENTS.md) for event configuration, idempotent fulfillment, local webhook forwarding, and the test-mode verification checklist. Adding secrets or applying database SQL is an external setup step; pushing source does not do either automatically.

## Routing and function duration

**No `vercel.json` is required.** Vercel's Next.js integration handles App Router pages, Server Actions, middleware, and API routes. Custom catch-all rewrites would interfere with that routing.

| Route | Runtime | Maximum duration |
| --- | --- | --- |
| `/api/tailor` | Node.js | 60 seconds |
| `/api/jobs/extract` | Node.js | 20 seconds |
| `/api/resumes/demo` | Node.js | 30 seconds |
| `/api/resumes/[id]/pdf` | Node.js | 60 seconds |
| `/api/checkout` | Node.js | 60 seconds |
| `/api/payments/status` | Node.js | 60 seconds |
| `/api/payments/webhook` | Node.js | 60 seconds |
| `/api/payments/entitlement` | Node.js | Platform default |

Explicit timeouts already live in each route's statically analyzable `runtime` and `maxDuration` exports; the small entitlement lookup uses the platform default. `next.config.ts` includes `assets/fonts/*.ttf` in PDF function tracing so Vercel packages the embedded fonts needed for Polish text. Keep these bundled fonts and their license in the deployment. Gemini's request timeout is 45 seconds, leaving time within the tailoring function for authentication, validation and saving. Avoid conflicting duration overrides in the Vercel dashboard. Next.js 13.5+ supports this route-level configuration directly. [Vercel function duration](https://vercel.com/docs/functions/configuring-functions/duration)

## Local verification

```sh
npm ci
npm run lint
npm test
npm run build
```

These checks cover the source, translation helpers, browser draft recovery, PDF rendering/watermarks, and payment verification logic, then build the production app. They do not establish that hosted credentials, SQL migrations, email delivery, Gemini quota, or live Stripe configuration work. Complete the configured workflow in [PAYMENTS.md](./PAYMENTS.md), including a test payment, cancellation, refund, and cross-account access check.

With the Vercel Git integration connected to this repository's `main` branch, a push triggers an automatic production build. Check that build's status in Vercel and test the resulting production URL; a successful local build or Git push is not confirmation that the live deployment is ready.
