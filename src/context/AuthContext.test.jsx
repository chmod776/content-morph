import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import React from 'react';

// vi.mock is hoisted to the top of the file, so the factory must not reference
// any variables declared in this file. We define the fns inside the factory and
// expose them via the module object so tests can reach them.
vi.mock('../lib/supabaseClient', () => {
  const getSession = vi.fn();
  const signOut = vi.fn().mockResolvedValue({});
  const signInWithOAuth = vi.fn();
  let _authCb;
  const onAuthStateChange = vi.fn((cb) => {
    _authCb = cb;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });

  return {
    supabase: {
      auth: { getSession, signOut, signInWithOAuth, onAuthStateChange },
      // expose callback handle so tests can trigger events
      _getAuthCb: () => _authCb,
    },
  };
});

// Silence network calls from syncUser
global.fetch = vi.fn().mockResolvedValue({ ok: false });

// Import AFTER vi.mock so we get the mocked version
import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';

// Shorthand helpers
const auth = () => supabase.auth;
const fireAuthEvent = (event, session) => supabase._getAuthCb()(event, session);

// Tiny probe component
function Probe() {
  const { user, loading, isAuthenticated } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.id : 'null'}</span>
      <span data-testid="auth">{String(isAuthenticated)}</span>
    </div>
  );
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Re-apply the persistent default for signOut after clearAllMocks resets it
  auth().signOut.mockResolvedValue({});
  // Re-apply fetch default
  global.fetch = vi.fn().mockResolvedValue({ ok: false });
});

// ---------------------------------------------------------------------------
describe('expired session on mount', () => {
  it('sets user to null and resolves loading when getSession returns an error', async () => {
    auth().getSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'JWT expired' },
    });

    renderWithAuth();

    expect(screen.getByTestId('loading').textContent).toBe('true');

    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false'),
    );

    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('auth').textContent).toBe('false');
    // Stale token should have been purged
    expect(auth().signOut).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
describe('TOKEN_REFRESHED event', () => {
  it('updates user state without toggling loading to true (no flicker)', async () => {
    const initialUser = { id: 'user-1', email: 'a@b.com' };
    auth().getSession.mockResolvedValue({
      data: { session: { user: initialUser, access_token: 'tok-1' } },
      error: null,
    });

    renderWithAuth();

    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false'),
    );

    // Track every value loading takes while the event is handled
    const loadingValues = [];
    const obs = new MutationObserver(() => {
      loadingValues.push(screen.getByTestId('loading').textContent);
    });
    obs.observe(screen.getByTestId('loading'), { childList: true, subtree: true });

    await act(async () => {
      fireAuthEvent('TOKEN_REFRESHED', {
        user: { id: 'user-1', email: 'a@b.com' },
        access_token: 'tok-2',
      });
    });

    obs.disconnect();

    // loading must never have gone back to true during the silent refresh
    expect(loadingValues.every((v) => v === 'false')).toBe(true);
    expect(screen.getByTestId('user').textContent).toBe('user-1');
    expect(screen.getByTestId('auth').textContent).toBe('true');
  });
});

// ---------------------------------------------------------------------------
describe('SIGNED_OUT event (refresh failure)', () => {
  it('clears user and keeps loading false when Supabase fires SIGNED_OUT', async () => {
    auth().getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-2' }, access_token: 'tok-1' } },
      error: null,
    });

    renderWithAuth();

    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false'),
    );

    expect(screen.getByTestId('user').textContent).toBe('user-2');

    await act(async () => {
      fireAuthEvent('SIGNED_OUT', null);
    });

    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('auth').textContent).toBe('false');
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  it('resolves loading even if SIGNED_OUT fires before getSession completes', async () => {
    // getSession never resolves on its own in this test
    let resolveGetSession;
    auth().getSession.mockReturnValue(
      new Promise((res) => { resolveGetSession = res; }),
    );

    renderWithAuth();

    expect(screen.getByTestId('loading').textContent).toBe('true');

    await act(async () => {
      fireAuthEvent('SIGNED_OUT', null);
    });

    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('loading').textContent).toBe('false');

    // Late getSession resolution must not flip state back
    await act(async () => {
      resolveGetSession({ data: { session: null }, error: null });
    });

    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('null');
  });
});
