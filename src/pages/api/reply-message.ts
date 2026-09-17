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
    const { messageId, replyBody: rawReplyBody } = await request.json();
    const replyBody = typeof rawReplyBody === 'string' ? rawReplyBody.trim() : '';

    if (!messageId || !replyBody) {
      return new Response(JSON.stringify({ success: false, error: 'Missing fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Idempotency guard, done as an atomic claim rather than read-then-write.
    // Two near-simultaneous requests for the same message (double click, a
    // duplicate rendered card, a client retry, etc.) both racing a plain
    // SELECT-then-UPDATE can both pass the check before either one writes —
    // that's exactly what happened before. This UPDATE's WHERE clause is
    // evaluated atomically by Postgres per-row, so only one concurrent
    // request can ever match and "win" the claim within the window; the
    // loser gets 0 rows back and treats it as a duplicate instead of sending
    // a second email. The cutoff is server-generated (never user input) so
    // it's safe to interpolate directly into the filter expression.
    const dedupeCutoff = new Date(Date.now() - 5_000).toISOString();
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from('contact_messages')
      .update({ last_reply_body: replyBody, last_reply_sent_at: new Date().toISOString() })
      .eq('id', messageId)
      .or(`last_reply_sent_at.is.null,last_reply_sent_at.lt.${dedupeCutoff}`)
      .select('id, name, email, message')
      .maybeSingle();

    if (claimError) {
      console.error('[reply-message] claim error:', claimError.message);
      return new Response(JSON.stringify({ success: false, error: 'Server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let original = claimed;
    if (!original) {
      // Didn't win the claim — either the message doesn't exist, or this is
      // a genuine duplicate of a reply just sent. Distinguish the two.
      const { data: existing } = await supabaseAdmin
        .from('contact_messages')
        .select('id')
        .eq('id', messageId)
        .maybeSingle();

      if (!existing) {
        return new Response(JSON.stringify({ success: false, error: 'Message not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, deduped: true }), {
        status: 200,
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
      // Release the claim so a genuine retry after a real failure isn't
      // permanently blocked by the dedupe window.
      await supabaseAdmin
        .from('contact_messages')
        .update({ last_reply_body: null, last_reply_sent_at: null })
        .eq('id', messageId);
      return new Response(JSON.stringify({ success: false, error: 'Failed to send email' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Store this reply in the conversation history so the admin dashboard
    // can render the full back-and-forth, not just the most recent message.
    const { data: replyRow, error: replyInsertError } = await supabaseAdmin
      .from('message_replies')
      .insert({ message_id: messageId, body: replyBody })
      .select('id, body, sent_at')
      .single();

    if (replyInsertError) {
      // The email already sent successfully — don't fail the request over a
      // history-logging error, just log it for visibility.
      console.error('[reply-message] history insert error:', replyInsertError.message);
    }

    return new Response(JSON.stringify({ success: true, reply: replyRow ?? null }), {
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
