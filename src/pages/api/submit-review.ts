import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';

export const prerender = false;

// Best-effort spam guard: at most 3 submissions per IP per hour. This lives in
// memory, so it resets when the serverless instance recycles; the real
// safeguard is that nothing appears on the site until an admin approves it.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json();

    // Honeypot: real visitors never see or fill this field. Pretend success
    // so bots don't learn they were filtered.
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return json({ success: true });
    }

    const name = String(body.name ?? '').replace(/\s+/g, ' ').trim();
    const message = String(body.message ?? '').replace(/[ \t]+/g, ' ').trim();
    const ratingRaw = body.rating;
    const rating = ratingRaw === null || ratingRaw === undefined || ratingRaw === '' ? null : Number(ratingRaw);

    if (name.length < 2 || name.length > 60) {
      return json({ success: false, error: 'Please enter your name (2 to 60 characters).' }, 400);
    }
    if (message.length < 10 || message.length > 500) {
      return json({ success: false, error: 'Please write between 10 and 500 characters.' }, 400);
    }
    if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return json({ success: false, error: 'Rating must be between 1 and 5.' }, 400);
    }
    if (/https?:\/\/|www\./i.test(name + ' ' + message)) {
      return json({ success: false, error: 'Please leave out web links.' }, 400);
    }

    let ip = 'unknown';
    try {
      ip = clientAddress || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    } catch {
      ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    }
    if (rateLimited(ip)) {
      return json({ success: false, error: 'You have sent a few reviews already. Please try again later.' }, 429);
    }

    const { error } = await supabaseAdmin.from('reviews').insert({
      name,
      message,
      rating,
      status: 'pending',
    });

    if (error) {
      console.error('[submit-review] Supabase insert failed:', error.message);
      return json({ success: false, error: 'Could not save your review. Please try again.' }, 500);
    }

    return json({ success: true });
  } catch (err) {
    console.error('[submit-review] error:', err);
    return json({ success: false, error: 'Something went wrong. Please try again.' }, 500);
  }
};
