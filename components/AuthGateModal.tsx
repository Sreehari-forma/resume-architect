'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { AuthForm } from '@/components/AuthForm';
import '@/app/profile.css';
import '@/app/guest.css';

export default function AuthGateModal({ intent, configured, onClose }: {
  intent: 'save' | 'export'; configured: boolean; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);

  return <dialog ref={dialog} className="guest-auth-modal" aria-labelledby="guest-auth-title" aria-describedby="guest-auth-description" onCancel={onClose}>
    <button type="button" className="icon-button guest-auth-close" onClick={onClose} aria-label="Close account prompt"><X size={20}/></button>
    <h1 id="guest-auth-title">{intent === 'export' ? 'Your CV is ready for its next step.' : 'Give your CV a home.'}</h1>
    <p id="guest-auth-description">Create an account or sign in to {intent === 'export' ? 'download and export' : 'save to your profile'}. Your CV is kept in this browser and will transfer to your new profile after sign-in.</p>
    <AuthForm configured={configured} initialMode="signup" />
    <button type="button" className="button button-secondary guest-keep-editing" onClick={onClose}>Keep editing as a guest</button>
  </dialog>;
}
