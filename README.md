# Dosis Kardia Foundation — Website

Astro + Tailwind v4 + Supabase + Paystack.

## Setup

```bash
npm install
cp .env.example .env   # fill in your Supabase and Paystack keys
npm run dev
```

## Supabase

Run `supabase/schema.sql` in your Supabase project's SQL editor before
testing donations or the contact form — it creates the `donations` and
`contact_messages` tables the API routes write to.

## Pages

- `/` — home
- `/about` — who we are, vision, mission, objectives, core values
- `/programs` — the 5 pillars (education, food, shelter, medical, guidance)
- `/impact` — narrative impact section (add real stats when the client shares numbers)
- `/donate` — Paystack inline checkout, verified server-side
- `/contact` — contact form, saved to Supabase

## Still needed from the client

- Full email address and phone number
- Real photos (rights-cleared)
- Real impact figures for the homepage counters
- Paystack live keys (currently using placeholders in `.env.example`)
