import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Placeholder fallback keeps the site rendering (landing, terms, privacy)
  // when the build ran without Supabase variables; sign-in and data calls
  // will fail until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.
  console.warn('Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key'
);
