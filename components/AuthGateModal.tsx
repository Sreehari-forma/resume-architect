'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { AuthForm } from '@/components/AuthForm';
import { useI18n } from '@/lib/i18n';
import '@/app/profile.css';
import '@/app/guest.css';

export default function AuthGateModal({ intent, configured, onClose }: {
  intent: 'save' | 'export'; configured: boolean; onClose: () => void;
}) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);

  return <dialog ref={dialog} className="guest-auth-modal" aria-labelledby="guest-auth-title" aria-describedby="guest-auth-description" onCancel={onClose}>
    <button type="button" className="icon-button guest-auth-close" onClick={onClose} aria-label={t('Close account prompt')}><X size={20}/></button>
    <h1 id="guest-auth-title">{t(intent === 'export' ? 'Your final CV, without the watermark.' : 'Give your CV a home.')}</h1>
    <p id="guest-auth-description">{t(intent === 'export' ? 'Create an account or sign in to continue to the one-time purchase for a clean final PDF. Your draft will transfer to your profile. You can keep editing and save drafts for free.' : 'Create an account or sign in to sync your CV to your profile. Your draft stays in this browser while you edit, and saving guest drafts is free.')}</p>
    <AuthForm configured={configured} initialMode="signup" />
    <button type="button" className="button button-secondary guest-keep-editing" onClick={onClose}>{t('Keep editing as a guest')}</button>
  </dialog>;
}
