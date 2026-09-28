import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';

export const prerender = false;

// Public list of approved reviews only. Only the fields the site displays are
// returned; the review id and moderation fields never leave the server.
export const GET: APIRoute = async () => {
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('name, rating, message, created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('[reviews] Supabase select failed:', error.message);
    return new Response(JSON.stringify({ success: false, reviews: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, reviews: data ?? [] }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // New approvals show up within about a minute.
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
};
