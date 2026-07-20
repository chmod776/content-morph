import { supabase } from '../lib/supabaseClient';

/**
 * Wrapper around fetch that automatically attaches the current
 * Supabase session token as an Authorization: Bearer header.
 *
 * If the server returns 401, a `sessionExpired` CustomEvent is dispatched
 * on `window` so the app can prompt the user to re-authenticate without
 * losing their in-progress work.
 */
export async function apiFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { ...(options.headers || {}) };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  // Remove credentials:include — we use Bearer tokens now
  const { credentials: _removed, ...rest } = options;
  const response = await fetch(url, { ...rest, headers });

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('sessionExpired'));
  }

  return response;
}
