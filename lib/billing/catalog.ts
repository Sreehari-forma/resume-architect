export const RESUME_PRICES = { pln: 500, usd: 125, eur: 115 } as const;
export type BillingCurrency = keyof typeof RESUME_PRICES;
export type ResumeLocale = 'en' | 'pl';

export interface ResumeSnapshot {
  id: string;
  user_id: string;
  fingerprint: string;
  profile: import('@/types').UserProfile;
  locale: ResumeLocale;
}

export interface ResumeOrder {
  id: string;
  resume_id: string;
  user_id: string;
  currency: BillingCurrency;
  amount: number;
  status: 'pending' | 'paid' | 'refunded' | 'disputed';
  checkout_session_id: string | null;
  payment_intent_id: string | null;
  generation: number;
}
