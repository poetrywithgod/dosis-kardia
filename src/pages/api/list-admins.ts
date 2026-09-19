import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';
import { requireAdmin, unauthorized } from '../../lib/requireAdmin';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const user = await requireAdmin(request);
  if (!user) return unauthorized();

  try {
    // Every user in Supabase Auth for this project is an admin; there's no
    // separate roles table. Fine for a small team; if that ever changes,
    // this is the place to add a role filter.
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const admins = data.users
      .map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return new Response(JSON.stringify({ success: true, admins, currentUserId: user.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[list-admins] error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
