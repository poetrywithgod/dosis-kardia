import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';
import { requireAdmin, unauthorized } from '../../lib/requireAdmin';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const user = await requireAdmin(request);
  if (!user) return unauthorized();

  try {
    const { email: rawEmail } = await request.json();
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ success: false, error: 'A valid email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Send a Supabase invite email. The new admin clicks the link, lands on
    // /admin/reset-password, and sets their own password before ever seeing
    // the dashboard. No temporary password is generated or stored anywhere.
    const origin = new URL(request.url).origin;
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/admin/reset-password`,
    });

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        admin: { id: data.user.id, email: data.user.email, created_at: data.user.created_at, last_sign_in_at: null },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[create-admin] error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
