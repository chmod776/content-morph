import { createClient } from '@supabase/supabase-js';

// Vite exposes VITE_* env vars to the browser automatically.
// Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Replit secrets.
const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Add them as Replit secrets (same values as SUPABASE_URL / SUPABASE_ANON_KEY).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist the session in localStorage so users stay signed in across page loads.
    persistSession: true,
    // Automatically refresh the access token before it expires.
    autoRefreshToken: true,
    // Detect the OAuth redirect callback on page load.
    detectSessionInUrl: true,
  },
});
