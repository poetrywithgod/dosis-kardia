import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const resendApiKey = import.meta.env.RESEND_API_KEY;
  const fromEmail = import.meta.env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !fromEmail) {
    return new Response(
      JSON.stringify({ success: false, error: 'Email sending is not configured yet' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Require a valid Supabase session — only the signed-in admin can send replies.
  const authHeader = request.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) {
    return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { messageId, replyBody } = await request.json();

    if (!messageId || !replyBody?.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'Missing fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Look up the original message so we know who to send to and can quote it
    const { data: original, error: fetchError } = await supabaseAdmin
      .from('contact_messages')
      .select('name, email, message')
      .eq('id', messageId)
      .single();

    if (fetchError || !original) {
      return new Response(JSON.stringify({ success: false, error: 'Message not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1C1C1C;">
        <p style="color:#F2A93B; font-weight: 600; margin-bottom: 4px;">Dosis Kardia Foundation</p>
        <p style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(replyBody)}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #888; font-size: 13px;">Your original message:</p>
        <p style="color: #888; font-size: 13px; white-space: pre-wrap;">${escapeHtml(original.message)}</p>
      </div>
    `;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Dosis Kardia Foundation <${fromEmail}>`,
        to: original.email,
        subject: 'Re: your message to Dosis Kardia Foundation',
        html: emailHtml,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('[reply-message] Resend error:', errText);
      return new Response(JSON.stringify({ success: false, error: 'Failed to send email' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[reply-message] error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
