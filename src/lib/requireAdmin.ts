import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase';

// Shared guard for admin-only API routes: verifies the request carries a
// valid Supabase session token and returns the signed-in user, or null if
// the request should be rejected with 401.
export async function requireAdmin(request: Request): Promise<User | null> {
  const authHeader = request.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export function unauthorized() {
  return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
