import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';
import { requireAdmin, unauthorized } from '../../lib/requireAdmin';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const user = await requireAdmin(request);
  if (!user) return unauthorized();

  try {
    const { adminId } = await request.json();
    if (!adminId || typeof adminId !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'Missing adminId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (adminId === user.id) {
      return new Response(JSON.stringify({ success: false, error: "You can't remove your own account" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(adminId);
    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[remove-admin] error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
