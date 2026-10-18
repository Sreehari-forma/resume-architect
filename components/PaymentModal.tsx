'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CreditCard, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { UserProfile } from '@/types';

export default function PaymentModal({ profile, onClose, onPaid, onAuthRequired }: {
  profile: UserProfile;
  onClose: () => void;
  onPaid: (resumeId: string) => void;
  onAuthRequired: () => void;
}) {
  const { locale, t } = useI18n();
  const [currency, setCurrency] = useState<'pln' | 'usd' | 'eur'>(locale === 'pl' ? 'pln' : 'usd');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);

  async function checkout() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, locale, currency }), signal: AbortSignal.timeout(30000),
      });
      const result = await response.json();
      if (response.status === 401) { onAuthRequired(); return; }
      if (!response.ok) throw new Error(result.error || 'We could not start checkout. Please try again.');
      if (result.paid === true && typeof result.resumeId === 'string') { onPaid(result.resumeId); return; }
      // Checkout is hosted by Stripe. Never navigate to arbitrary URLs from a response.
      const url = new URL(result.url);
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com' || url.username || url.password) {
        throw new Error('Payment setup is unavailable. Your draft remains saved.');
      }
      window.location.assign(url.href);
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== 'TimeoutError' ? cause.message : 'We could not start checkout. Please try again.');
    } finally { submitting.current = false; setBusy(false); }
  }

  return <dialog ref={dialog} className="payment-modal" aria-labelledby="payment-title" aria-describedby="payment-description" onCancel={onClose}>
    <button type="button" className="icon-button payment-close" onClick={onClose} aria-label={t('Close payment prompt')}><X size={19}/></button>
    <div className="payment-symbol"><CreditCard size={24}/></div>
    <h2 id="payment-title">{t('Unlock your final CV')}</h2>
    <p id="payment-description">{t('One payment. A clean PDF for this resume version.')}</p>
    <fieldset className="payment-currencies" disabled={busy}><legend>{t('Choose currency')}</legend>
      {([{ id: 'pln', label: 'Polish złoty', price: '5 PLN' }, { id: 'usd', label: 'US dollars', price: '$1.25' }, { id: 'eur', label: 'Euros', price: '€1.15' }] as const).map(option => <label key={option.id} className={currency === option.id ? 'selected' : ''}><input type="radio" name="payment-currency" checked={currency === option.id} value={option.id} onChange={() => setCurrency(option.id)}/><strong>{option.price}</strong><span>{t(option.label)}</span></label>)}
    </fieldset>
    <p className="payment-price-note">{t('One-time price for this CV version. These are fixed local prices, not live exchange rates.')}</p>
    {error && <p className="studio-message error" role="alert">{t(error)}</p>}
    <button type="button" className="button button-primary payment-submit" disabled={busy} onClick={() => void checkout()}>{busy ? <LoaderCircle size={16} className="spin"/> : <CreditCard size={16}/>} {t(busy ? 'Opening checkout…' : 'Continue to secure checkout')}<ArrowRight size={15}/></button>
    <span className="payment-secure"><ShieldCheck size={13}/>{t('Secure payment with Stripe')}</span>
    <p className="payment-free-note">{t('Your draft and watermarked demo downloads stay free.')}</p>
    <button type="button" className="button button-secondary payment-keep-editing" onClick={onClose}>{t('Keep editing')}</button>
  </dialog>;
}
