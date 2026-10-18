'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createStore, useStore } from 'zustand';
import type { TailoredResume, UserProfile, WorkspaceData } from '@/types';
import { profileSchema } from '@/lib/schemas';
import { importGuestProfile } from '@/app/actions/profile';
import AuthGateModal from '@/components/AuthGateModal';
import {
  EMPTY_STUDIO, clearImportedDraft, draftBelongsToEmail, newGuestDraft,
  readAccountStudio, readGuestDraft, updateGuestDraft, writeAccountStudio, writeGuestDraft,
  type GuestDraft, type StudioDraft,
} from '@/lib/guest-draft';

const STORAGE_ERROR = 'Browser storage is unavailable or full. Keep this tab open and enable storage before signing in so your CV can be preserved.';
type ImportState = 'idle' | 'pending' | 'error' | 'conflict' | 'editing' | 'saved';
interface WorkspaceState extends WorkspaceData {
  resume: TailoredResume | null;
  studioDraft: StudioDraft;
  hydrated: boolean;
  guestDraft: GuestDraft | null;
  draftStorageError: string | null;
  authIntent: 'save' | 'export' | null;
  importState: ImportState;
  importMessage: string;
  setProfile: (profile: UserProfile) => boolean;
  recordGuestProfile: (profile: UserProfile) => boolean;
  setResume: (resume: TailoredResume | null) => void;
  setStudioDraft: (patch: Partial<StudioDraft>) => void;
  requestAuth: (intent: 'save' | 'export', profile?: UserProfile) => void;
}

function createWorkspaceStore(data: WorkspaceData) {
  return createStore<WorkspaceState>((set, get) => {
    function persistGuest(patch: Partial<GuestDraft> = {}) {
      const state = get();
      const previous = state.guestDraft ?? newGuestDraft(state.profile);
      const draft = updateGuestDraft(previous, { profile: state.profile, studio: state.studioDraft,
        resume: state.resume, ...patch });
      const saved = writeGuestDraft(draft);
      set({ guestDraft: draft, draftStorageError: saved ? null : STORAGE_ERROR });
      return saved;
    }
    function persistAccount() {
      const state = get();
      if (state.userId) writeAccountStudio(state.userId, state.profile, state.studioDraft, state.resume);
    }
    return {
      ...data, resume: null, studioDraft: { ...EMPTY_STUDIO }, hydrated: false,
      guestDraft: null, draftStorageError: null, authIntent: null,
      importState: 'idle', importMessage: '',
      recordGuestProfile: (profile) => {
        if (!get().isGuest) return false;
        const changed = JSON.stringify(profile) !== JSON.stringify(get().profile);
        set({ profile, ...(changed ? { resume: null } : {}) });
        return persistGuest();
      },
      setProfile: (profile) => {
        if (get().isGuest) return get().recordGuestProfile(profile);
        const { guestDraft, importState } = get();
        if (guestDraft && importState === 'editing') clearImportedDraft(guestDraft);
        set({ profile, resume: null, hasSavedProfile: true,
          ...(importState === 'editing' ? { guestDraft: null, importState: 'saved', importMessage: 'Your guest CV is now saved to your account.' } : {}) });
        persistAccount();
        return true;
      },
      setResume: (resume) => {
        set({ resume });
        if (get().isGuest) persistGuest(); else persistAccount();
      },
      setStudioDraft: (patch) => {
        set({ studioDraft: { ...get().studioDraft, ...patch } });
        if (get().isGuest) persistGuest(); else persistAccount();
      },
      requestAuth: (intent, profile) => {
        if (!get().isGuest) return;
        if (profile) get().recordGuestProfile(profile);
        if (persistGuest({ intent: { action: intent, email: null } })) set({ authIntent: intent });
      },
    };
  });
}

const WorkspaceContext = createContext<ReturnType<typeof createWorkspaceStore> | null>(null);

export function WorkspaceProvider({ children, data }: {children: React.ReactNode; data: WorkspaceData}) {
  const pathname = usePathname();
  const storeRef = useRef<ReturnType<typeof createWorkspaceStore> | null>(null);
  if (!storeRef.current) storeRef.current = createWorkspaceStore(data);
  const store = storeRef.current;
  const state = useStore(store);
  const importing = useRef(false);

  async function importDraft(draft: GuestDraft) {
    if (!data.userId || importing.current) return;
    importing.current = true;
    store.setState({ guestDraft: draft, importState: 'pending', importMessage: 'Saving your guest CV to your account…' });
    try {
      const result = await importGuestProfile(draft.profile, data.userId);
      if (result.status === 'imported') {
        const profile = profileSchema.parse(draft.profile);
        const cached = writeAccountStudio(data.userId, profile, draft.studio, draft.resume);
        const cleared = cached && clearImportedDraft(draft);
        store.setState({ profile, resume: draft.resume, studioDraft: draft.studio, hasSavedProfile: true,
          guestDraft: cleared ? null : draft, importState: 'saved',
          importMessage: cleared ? 'Your guest CV is now saved to your account. Your studio preview is ready to export.' : 'Your CV is saved to your account. A browser draft remains available as a backup.' });
      } else if (result.status === 'existing') {
        store.setState({ importState: 'conflict', importMessage: 'This account already has a profile. Your guest CV is still stored in this browser; your account profile has not been changed.' });
      } else {
        store.setState({ importState: 'error', importMessage: result.error || 'Your guest CV could not be saved. It is still stored in this browser.' });
      }
    } catch {
      store.setState({ importState: 'error', importMessage: 'Your guest CV could not be saved. Check your connection and retry; your draft is still in this browser.' });
    } finally { importing.current = false; }
  }

  useEffect(() => {
    const draft = readGuestDraft();
    if (data.isGuest && draft) {
      store.setState({ profile: draft.profile, resume: draft.resume, studioDraft: draft.studio, guestDraft: draft });
    } else if (data.userId) {
      const cached = readAccountStudio(data.userId, data.profile);
      if (cached) store.setState({ resume: cached.resume, studioDraft: cached.studio });
      if (draft && draftBelongsToEmail(draft, data.userEmail)) void importDraft(draft);
    }
    store.setState({ hydrated: true });
    // One bootstrap per authenticated workspace; the server verifies the session again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  function openGuestDraft() {
    const draft = store.getState().guestDraft;
    if (!draft) return;
    store.setState({ profile: draft.profile, resume: draft.resume, studioDraft: draft.studio,
      importState: 'editing', importMessage: 'Your guest CV is open for editing. Save changes will replace this account’s profile. The browser copy stays until saving succeeds.' });
  }

  return <WorkspaceContext.Provider value={store}>
    {state.hydrated && state.importState !== 'pending' ? <>
      {state.importMessage && <div className="draft-recovery" role="status"><p>{state.importMessage}</p><div>
        {state.importState === 'error' && state.guestDraft && <button className="button button-secondary" onClick={() => void importDraft(state.guestDraft!)}>Retry saving</button>}
        {pathname === '/dashboard' && ['error', 'conflict'].includes(state.importState) && <button className="button button-secondary" onClick={openGuestDraft}>Open guest CV</button>}
        {['editing', 'error', 'conflict'].includes(state.importState) && <Link className="button button-secondary" href="/dashboard">Edit profile</Link>}
        {state.importState === 'saved' && <Link className="button button-secondary" href="/studio">Continue to studio</Link>}
      </div></div>}
      {state.draftStorageError && <div className="draft-recovery" role="alert">{state.draftStorageError}</div>}
      {children}
    </> : <main className="workspace-restoring" id="main-content" role="status">{state.importMessage || 'Restoring your workspace…'}</main>}
    {state.authIntent && <AuthGateModal intent={state.authIntent} configured={data.authConfigured} onClose={() => store.setState({ authIntent: null })} />}
  </WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const store = useContext(WorkspaceContext);
  if (!store) throw new Error('useWorkspace requires WorkspaceProvider');
  return useStore(store);
}
