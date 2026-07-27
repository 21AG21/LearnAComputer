"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { PROGRESS_EVENT } from "@/lib/progress";
import { clearRemote, pullAndMerge, push } from "@/lib/cloudProgress";

export type SyncState = "off" | "idle" | "syncing" | "saved" | "error";

interface AuthValue {
  session: Session | null;
  email: string | null;
  /** False when this installation has no Supabase credentials — the whole site still works. */
  enabled: boolean;
  ready: boolean;
  syncState: SyncState;
  signOut: () => Promise<void>;
  forgetAccountProgress: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({
  session: null,
  email: null,
  enabled: false,
  ready: true,
  syncState: "off",
  signOut: async () => {},
  forgetAccountProgress: async () => {},
});

export const useAuth = () => useContext(AuthContext);

/** Long enough that finishing several lessons quickly is one write, short enough to feel immediate. */
const PUSH_DEBOUNCE_MS = 1500;

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [syncState, setSyncState] = useState<SyncState>(supabase ? "idle" : "off");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  // On sign-in, merge the two copies before anything else touches progress.
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setSyncState("syncing");
    pullAndMerge(userId).then((result) => {
      if (cancelled) return;
      setSyncState(result ? "saved" : "error");
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Push after local changes, coalesced.
  useEffect(() => {
    if (!userId) return;
    const onChange = () => {
      if (timer.current) clearTimeout(timer.current);
      setSyncState("syncing");
      timer.current = setTimeout(async () => {
        const ok = await push(userId);
        setSyncState(ok ? "saved" : "error");
      }, PUSH_DEBOUNCE_MS);
    };
    window.addEventListener(PROGRESS_EVENT, onChange);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, onChange);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [userId]);

  const signOut = useCallback(async () => {
    // Flush anything still waiting rather than losing the last lesson finished.
    if (timer.current) clearTimeout(timer.current);
    if (userId) await push(userId);
    await supabase?.auth.signOut();
  }, [userId]);

  const forgetAccountProgress = useCallback(async () => {
    if (userId) await clearRemote(userId);
  }, [userId]);

  return (
    <AuthContext.Provider
      value={{
        session,
        email: session?.user.email ?? null,
        enabled: !!supabase,
        ready,
        syncState,
        signOut,
        forgetAccountProgress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
