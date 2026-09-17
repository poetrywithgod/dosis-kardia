import { createClient } from '@supabase/supabase-js';

// Client-side Supabase client for the admin dashboard.
// Uses the public anon key only — safe to ship to the browser.
// All row access is gated by RLS policies requiring an authenticated session.
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabaseBrowser = createClient(supabaseUrl ?? '', anonKey ?? '');
