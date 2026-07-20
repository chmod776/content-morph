import { supabase } from '../lib/supabaseClient';

/**
 * Wrapper around fetch that automatically attaches the current
 * Supabase session token as an Authorization: Bearer header.
 */
export async function apiFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { ...(options.headers || {}) };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  // Remove credentials:include — we use Bearer tokens now
  const { credentials: _removed, ...rest } = options;
  return fetch(url, { ...rest, headers });
}
