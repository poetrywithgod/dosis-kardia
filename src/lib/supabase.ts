import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client for API routes only.
// SUPABASE_SERVICE_ROLE_KEY must never be exposed to the browser —
// it is only read here, inside server-rendered API routes.
const supabaseUrl = import.meta.env.SUPABASE_URL;
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn(
    "[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set. " +
      "Server-side Supabase calls will fail until .env is configured."
  );
}

export const supabaseAdmin = createClient(
  supabaseUrl ?? "",
  serviceRoleKey ?? "",
  {
    auth: { persistSession: false },
  }
);
