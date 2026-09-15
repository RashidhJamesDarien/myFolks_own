"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

/**
 * Tracks the Supabase session for the whole app.
 *
 * `backendConnected` mirrors `authenticated` because every API
 * route in this app authenticates with the session access token.
 */
export function useSupabaseAuth() {
  const [authLoading, setAuthLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);

  useEffect(() => {
    let mounted = true;

    const apply = (hasSession: boolean) => {
      if (!mounted) return;

      setAuthenticated(hasSession);
      setBackendConnected(hasSession);
      setAuthLoading(false);
    };

    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      apply(Boolean(session));
    };

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(Boolean(session));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { authLoading, authenticated, backendConnected };
}
