import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { EMPTY_PROFILE } from '../lib/demo';
import { RESUME_PRICES, type ResumeOrder } from '../lib/billing/catalog';
import { checkoutRequestSchema, resumeFingerprint, sessionIdSchema } from '../lib/billing/validation';
import { fulfillCheckout, revokeIntent, type FulfillmentStore, type PaymentProvider } from '../lib/billing/fulfillment';
import { verifyWebhook } from '../lib/billing/webhook';
import { billingEnvironment } from '../lib/billing/server';
import { checkoutParameters } from '../lib/billing/checkout-parameters';

function fixture() {
  const order: ResumeOrder = {
    id: '0e8becaf-d34d-4b5e-a233-9b83e2394798', resume_id: '123956da-9c31-4cb8-84aa-53da0b02e8f2',
    user_id: '4e8f92c7-3725-47af-b23c-94b704ba32c9', currency: 'pln', amount: 500,
    status: 'pending', checkout_session_id: 'cs_test_example123', payment_intent_id: null, generation: 1,
  };
  const metadata = { order_id: order.id, resume_id: order.resume_id, user_id: order.user_id, generation: '1' };
  const session = {
    id: order.checkout_session_id, object: 'checkout.session', mode: 'payment', currency: 'pln', amount_total: 500,
    client_reference_id: order.user_id, metadata: { ...metadata }, payment_status: 'paid', status: 'complete', payment_intent: 'pi_example123',
  } as unknown as Stripe.Checkout.Session;
  const intent = {
    id: 'pi_example123', object: 'payment_intent', metadata: { ...metadata }, currency: 'pln', amount: 500,
    amount_received: 500, status: 'succeeded', latest_charge: 'ch_example123',
  } as unknown as Stripe.PaymentIntent;
  const charge = {
    id: 'ch_example123', object: 'charge', payment_intent: intent.id, currency: 'pln', amount: 500,
    paid: true, refunded: false, amount_refunded: 0, disputed: false,
  } as Stripe.Charge;
  let writes = 0;
  let grants = 0;
  const store: FulfillmentStore = {
    async findOrder(id) { return id === order.id ? { ...order } : null; },
    async recordPayment(orderId, sessionId, intentId, generation) {
      writes += 1;
      if (orderId !== order.id || generation !== order.generation || order.status === 'refunded' || order.status === 'disputed') return false;
      if (order.status !== 'paid') grants += 1;
      order.status = 'paid'; order.checkout_session_id = sessionId; order.payment_intent_id = intentId;
      return true;
    },
    async revokePayment(orderId, intentId, reason) {
      assert.equal(orderId, order.id);
      order.status = reason; order.payment_intent_id = intentId;
    },
  };
  const provider: PaymentProvider = {
    checkout: { sessions: { async retrieve(id) { assert.equal(id, session.id); return session; } } },
    paymentIntents: { async retrieve(id) { assert.equal(id, intent.id); return intent; } },
    charges: { async retrieve(id) { assert.equal(id, charge.id); return charge; } },
  };
  return { order, session, intent, charge, store, provider, writes: () => writes, grants: () => grants };
}

test('only fixed minor-unit prices and validated snapshot inputs are accepted', () => {
  assert.deepEqual(RESUME_PRICES, { pln: 500, usd: 125, eur: 115 });
  const input = { profile: structuredClone(EMPTY_PROFILE), locale: 'pl', currency: 'pln' };
  assert.equal(checkoutRequestSchema.safeParse(input).success, true);
  for (const invalid of [{ ...input, amount: 1 }, { ...input, paid: true }, { ...input, currency: 'gbp' }, { ...input, locale: 'de' }, { ...input, profile: { ...input.profile, email: 'invalid' } }]) {
    assert.equal(checkoutRequestSchema.safeParse(invalid).success, false);
  }
  assert.equal(sessionIdSchema.safeParse('https://evil.test').success, false);
});

test('fingerprints normalize field ordering and whitespace but bind content and language', () => {
  const profile = { ...structuredClone(EMPTY_PROFILE), fullName: ' Jan Kowalski ' };
  const reordered = Object.fromEntries(Object.entries(profile).reverse()) as unknown as typeof profile;
  assert.equal(resumeFingerprint(profile, 'pl'), resumeFingerprint(reordered, 'pl'));
  assert.equal(resumeFingerprint(profile, 'pl'), resumeFingerprint({ ...profile, fullName: 'Jan Kowalski' }, 'pl'));
  assert.notEqual(resumeFingerprint(profile, 'pl'), resumeFingerprint(profile, 'en'));
  assert.notEqual(resumeFingerprint(profile, 'pl'), resumeFingerprint({ ...profile, summary: 'New content' }, 'pl'));
});

test('a verified paid Stripe session unlocks its immutable resume and duplicate delivery grants once', async () => {
  const f = fixture();
  const expected = { paid: true, resumeId: f.order.resume_id };
  assert.deepEqual(await fulfillCheckout(f.session.id, f.provider, f.store, f.order.user_id), expected);
  assert.deepEqual(await fulfillCheckout(f.session.id, f.provider, f.store), expected);
  assert.equal(f.grants(), 1);
});

test('an unpaid or incomplete session never grants access', async () => {
  for (const patch of [{ payment_status: 'unpaid' }, { payment_status: 'no_payment_required' }, { status: 'open' }]) {
    const f = fixture(); Object.assign(f.session, patch);
    assert.deepEqual(await fulfillCheckout(f.session.id, f.provider, f.store), { paid: false });
    assert.equal(f.writes(), 0);
  }
});

test('verification rejects wrong owner, currency, total, metadata, session and generation', async () => {
  const mutations: Array<(f: ReturnType<typeof fixture>) => void> = [
    f => { f.session.currency = 'usd'; }, f => { f.session.amount_total = 1; },
    f => { f.session.client_reference_id = 'different-owner'; }, f => { f.session.metadata!.user_id = 'different-owner'; },
    f => { f.session.metadata!.resume_id = 'different-resume'; }, f => { f.session.metadata!.generation = '0'; },
    f => { f.order.checkout_session_id = 'cs_test_another123'; }, f => { f.order.amount = 1; f.session.amount_total = 1; },
    f => { f.session.mode = 'subscription'; },
  ];
  for (const mutate of mutations) {
    const f = fixture(); mutate(f);
    await assert.rejects(fulfillCheckout(f.session.id, f.provider, f.store), /does not match/);
    assert.equal(f.writes(), 0);
  }
  const f = fixture();
  await assert.rejects(fulfillCheckout(f.session.id, f.provider, f.store, 'other-account'), /does not match/);
  assert.equal(f.writes(), 0);
});

test('payment intent and charge are independently checked before entitlement is granted', async () => {
  const mutations: Array<(f: ReturnType<typeof fixture>) => void> = [
    f => { f.intent.metadata.user_id = 'different-owner'; }, f => { f.intent.amount = 1; },
    f => { f.charge.payment_intent = 'pi_other'; }, f => { f.charge.paid = false; },
    f => { f.charge.currency = 'eur'; }, f => { f.charge.amount = 1; },
  ];
  for (const mutate of mutations) {
    const f = fixture(); mutate(f);
    await assert.rejects(fulfillCheckout(f.session.id, f.provider, f.store), /does not match/);
    assert.equal(f.writes(), 0);
  }
});

test('refunds and disputes revoke access even when their webhook precedes checkout completion', async () => {
  for (const reason of ['refunded', 'disputed'] as const) {
    const f = fixture();
    await revokeIntent(f.intent.id, reason, f.provider, f.store);
    assert.deepEqual(await fulfillCheckout(f.session.id, f.provider, f.store), { paid: false });
    assert.equal(f.order.status, reason);
    assert.equal(f.writes(), 0);
  }
});

test('live Stripe charge reversal blocks fulfillment before its reversal webhook arrives', async () => {
  for (const patch of [{ refunded: true }, { amount_refunded: 1 }, { disputed: true }]) {
    const f = fixture(); Object.assign(f.charge, patch);
    assert.deepEqual(await fulfillCheckout(f.session.id, f.provider, f.store), { paid: false });
    assert.ok(['refunded', 'disputed'].includes(f.order.status));
    assert.equal(f.writes(), 0);
  }
});

test('a reversal racing with a successful verification cannot be overwritten by fulfillment', async () => {
  const f = fixture();
  f.provider.charges.retrieve = async () => { f.order.status = 'refunded'; return f.charge; };
  assert.deepEqual(await fulfillCheckout(f.session.id, f.provider, f.store), { paid: false });
  assert.equal(f.order.status, 'refunded');
});

test('provider network failures never grant access', async () => {
  const f = fixture();
  f.provider.charges.retrieve = async () => { throw new Error('Provider unavailable'); };
  await assert.rejects(fulfillCheckout(f.session.id, f.provider, f.store), /Provider unavailable/);
  assert.equal(f.writes(), 0);
});

test('Stripe SDK HTTP transport is verified against mocked provider responses', async () => {
  const f = fixture(); const paths: string[] = [];
  const stripe = new Stripe('sk_test_placeholder', {
    maxNetworkRetries: 0,
    httpClient: Stripe.createFetchHttpClient(async (input) => {
      const path = new URL(String(input)).pathname; paths.push(path);
      const body = path.includes('/checkout/sessions/') ? f.session : path.includes('/payment_intents/') ? f.intent : f.charge;
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    }),
  });
  assert.deepEqual(await fulfillCheckout(f.session.id, stripe, f.store, f.order.user_id), { paid: true, resumeId: f.order.resume_id });
  assert.deepEqual(paths, [`/v1/checkout/sessions/${f.session.id}`, `/v1/payment_intents/${f.intent.id}`, `/v1/charges/${f.charge.id}`]);
});

test('Checkout sends fixed catalog prices and disables dashboard-driven currency conversion', async () => {
  const f = fixture();
  const requests: URLSearchParams[] = [];
  const stripe = new Stripe('sk_test_placeholder', {
    maxNetworkRetries: 0,
    httpClient: Stripe.createFetchHttpClient(async (input, init) => {
      assert.equal(new URL(String(input)).pathname, '/v1/checkout/sessions');
      assert.equal(init?.method, 'POST');
      requests.push(new URLSearchParams(String(init?.body)));
      return new Response(JSON.stringify(f.session), { headers: { 'content-type': 'application/json' } });
    }),
  });
  for (const currency of ['pln', 'usd', 'eur'] as const) {
    const order = { ...f.order, currency, amount: RESUME_PRICES[currency] };
    await stripe.checkout.sessions.create(checkoutParameters(order, 'pl', 'https://resume-architect-seven.vercel.app'));
    const sent = requests.at(-1)!;
    assert.equal(sent.get('adaptive_pricing[enabled]'), 'false');
    assert.equal(sent.get('allow_promotion_codes'), 'false');
    assert.equal(sent.get('line_items[0][price_data][currency]'), currency);
    assert.equal(sent.get('line_items[0][price_data][unit_amount]'), String(RESUME_PRICES[currency]));
    assert.equal(sent.get('metadata[resume_id]'), order.resume_id);
    assert.equal(sent.get('metadata[user_id]'), order.user_id);
    assert.equal(sent.get('payment_intent_data[metadata][order_id]'), order.id);
    assert.equal(sent.get('allowed_payment_method_types[0]'), 'card');
    assert.equal(sent.get('success_url'), 'https://resume-architect-seven.vercel.app/studio?checkout_session_id={CHECKOUT_SESSION_ID}');
  }
});

test('webhook verification requires the exact signed raw body and current authentic signature', () => {
  const stripe = new Stripe('sk_test_placeholder');
  const secret = 'whsec_test_fixture';
  const payload = JSON.stringify({ id: 'evt_fixture', object: 'event', type: 'checkout.session.completed', data: { object: fixture().session } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  assert.equal(verifyWebhook(payload, signature, secret, stripe).id, 'evt_fixture');
  for (const [body, header] of [[`${payload} `, signature], [payload, null], [payload, 'bogus'], [payload, stripe.webhooks.generateTestHeaderString({ payload, secret: 'wrong-secret' })], [payload, stripe.webhooks.generateTestHeaderString({ payload, secret, timestamp: 1 })]]) {
    assert.throws(() => verifyWebhook(body!, header, secret, stripe), /Stripe signature/);
  }
});

test('missing payment configuration produces a clear setup error without reading secrets into responses', () => {
  const previous = process.env.STRIPE_SECRET_KEY;
  try {
    delete process.env.STRIPE_SECRET_KEY;
    assert.throws(() => billingEnvironment(), /Payments are not configured yet/);
  } finally {
    if (previous === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = previous;
  }
});
