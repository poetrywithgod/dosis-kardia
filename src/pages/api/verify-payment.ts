import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';

// This route must run server-side, not be statically prerendered
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const secretKey = import.meta.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    return new Response(
      JSON.stringify({ verified: false, error: 'Paystack secret key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { reference, name, email, amountNaira } = await request.json();

    if (!reference) {
      return new Response(JSON.stringify({ verified: false, error: 'Missing reference' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify the transaction directly with Paystack using the secret key.
    // Never trust the client-side callback alone.
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${secretKey}` },
      }
    );
    const verifyData = await verifyRes.json();

    const isSuccessful =
      verifyData?.status === true && verifyData?.data?.status === 'success';

    if (!isSuccessful) {
      return new Response(JSON.stringify({ verified: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Log the verified donation to Supabase.
    // amount_kobo comes from Paystack's own record, not the client, for integrity.
    const { error: dbError } = await supabaseAdmin.from('donations').insert({
      reference,
      donor_name: name ?? null,
      donor_email: email ?? verifyData.data.customer?.email ?? null,
      amount_kobo: verifyData.data.amount,
      amount_naira: amountNaira ?? verifyData.data.amount / 100,
      currency: verifyData.data.currency ?? 'NGN',
      paystack_status: verifyData.data.status,
      paid_at: verifyData.data.paid_at ?? null,
    });

    if (dbError) {
      // Payment is genuinely verified even if our own logging failed —
      // don't tell the donor their payment failed because of our DB.
      console.error('[verify-payment] Supabase insert failed:', dbError.message);
    }

    return new Response(JSON.stringify({ verified: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[verify-payment] error:', err);
    return new Response(JSON.stringify({ verified: false, error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
