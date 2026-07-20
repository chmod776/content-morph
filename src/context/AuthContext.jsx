import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

async function syncUser(session) {
  try {
    const r = await fetch('/api/auth/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });
    if (!r.ok) return session.user;
    return await r.json();
  } catch {
    return session.user;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on mount. If the stored token is expired and cannot be
    // refreshed (e.g. the user was offline for too long), getSession resolves
    // with a null session rather than throwing — we treat that as signed-out.
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // Unrecoverable session error — clear state and let the user sign in again.
        console.warn('Session restore error:', error.message);
        supabase.auth.signOut();   // purge the stale token from storage
        setUser(null);
        setLoading(false);
        return;
      }
      if (session) {
        syncUser(session).then(setUser).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes (sign-in, sign-out, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Fired on initial sign-in and after an OAuth redirect.
          const synced = await syncUser(session);
          setUser(synced);
          setLoading(false);
        } else if (event === 'INITIAL_SESSION') {
          // Fired once on load when Supabase has finished restoring a persisted
          // session. If there's no valid session, session is null — sign-out.
          if (session) {
            const synced = await syncUser(session);
            setUser(synced);
          } else {
            setUser(null);
          }
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // The access token was silently refreshed — update user state so any
          // downstream fetch calls use the latest token.
          const synced = await syncUser(session);
          setUser(synced);
        } else if (event === 'SIGNED_OUT') {
          // Explicit sign-out or an expired refresh token that Supabase could
          // not renew — clear state cleanly so the app redirects to sign-in.
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const logout = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, logout, login }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
