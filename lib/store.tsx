'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { createStore, useStore } from 'zustand';
import type { TailoredResume, UserProfile, WorkspaceData } from '@/types';
import { profileSchema } from '@/lib/schemas';

const STORAGE_KEY = 'forma-demo-profile-v1';
interface WorkspaceState extends WorkspaceData {
  resume: TailoredResume | null;
  hydrated: boolean;
  setProfile: (profile: UserProfile) => boolean;
  setResume: (resume: TailoredResume | null) => void;
}

function createWorkspaceStore(data: WorkspaceData) {
  return createStore<WorkspaceState>((set) => ({
    ...data, resume: null, hydrated: false,
    setProfile: (profile) => {
      set({ profile, resume: null });
      if (data.isDemo) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch { return false; }
      }
      return true;
    },
    setResume: (resume) => set({ resume }),
  }));
}

const WorkspaceContext = createContext<ReturnType<typeof createWorkspaceStore> | null>(null);

export function WorkspaceProvider({ children, data }: {children: React.ReactNode; data: WorkspaceData}) {
  const storeRef = useRef<ReturnType<typeof createWorkspaceStore> | null>(null);
  if (!storeRef.current) storeRef.current = createWorkspaceStore(data);
  const store = storeRef.current;
  useEffect(() => {
    if (data.isDemo) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = profileSchema.safeParse(JSON.parse(stored));
          if (parsed.success) store.setState({ profile: parsed.data });
        }
      } catch { /* Ignore invalid or inaccessible device-local demo data. */ }
    }
    store.setState({ hydrated: true });
  }, [data.isDemo, store]);
  return <WorkspaceContext.Provider value={store}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const store = useContext(WorkspaceContext);
  if (!store) throw new Error('useWorkspace requires WorkspaceProvider');
  return useStore(store);
}
