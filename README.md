# Dosis Kardia Foundation — Website

Website and admin dashboard for Dosis Kardia Foundation, a faith-driven
children's charity in Nigeria (RC: 164807).

**Stack:** Astro + Tailwind v4 + Supabase + Paystack + Resend, deployed on Vercel.
**Live:** https://dosis-kardia.vercel.app/

## Setup

```bash
npm install
cp .env.example .env   # fill in your Supabase, Paystack and Resend keys
npm run dev
```

Requires Node 22.12 or newer.

## Environment variables

See `.env.example`.

| Variable | Used for |
| --- | --- |
| `SUPABASE_URL`, `PUBLIC_SUPABASE_URL` | Supabase project URL (server and browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side API routes only, never exposed to the client |
| `PUBLIC_SUPABASE_ANON_KEY` | Admin login in the browser |
| `PAYSTACK_SECRET_KEY` | Server-side payment verification |
| `PUBLIC_PAYSTACK_PUBLIC_KEY` | Opens the Paystack checkout popup |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Emailing replies to contact-form messages |

## Supabase

Run `supabase/schema.sql` in your Supabase project's SQL editor before
testing donations, the contact form or the admin dashboard. It creates the
`donations`, `contact_messages`, `message_replies` and `reviews` tables and their
Row Level Security policies.

## Pages

- `/` — home
- `/about` — story, vision, mission, objectives, core values
- `/programs` — the 6 programs (education and scholarships, food, shelter, medical, guidance, partnerships)
- `/our-work` — information-first page: what we do, where giving goes, outreach diary
- `/impact` — impact figures and gallery
- `/donate` — Paystack inline checkout, verified server-side
- `/contact` — contact form, saved to Supabase
- `/admin` — admin dashboard (installable as a PWA): donations, contact
  messages and reply threads, review moderation, and admin invites/removal.
  Includes `/admin/login` and `/admin/reset-password`.

## API routes

`contact`, `verify-payment`, `reply-message`, `create-admin`, `list-admins`,
`remove-admin`, `submit-review`, `reviews` (all under `src/pages/api/`).

## Reviews

Visitors can submit a review (name, optional 1-5 rating, message) from the home and Our Work
pages. Submissions are saved as `pending` and only appear on the site, in the animated
right-to-left card strip, after an admin approves them in the dashboard's Reviews tab.
If you are setting up an existing database, run `supabase/reviews.sql` once in the Supabase
SQL editor.

## Images

Real photos live in `public/images/`, grouped by page (`home`, `about`,
`programs`, `impact`, `donate`, `contact`, `slideshow`). The Partnerships program expects
`public/images/programs/partnerships.jpg`.

## Content notes

- The foundation supports vulnerable children generally (street-connected children, scholarship
  children, and children reached through partner homes) and is not limited to Port Harcourt or
  Rivers State. Avoid city- or state-specific wording and avoid describing all beneficiaries as
  street children.
- The site is information-first: Donate is a plain link in the nav, and CTAs lead with
  "See our work" before "Give".

- The foundation's owners and runners are deliberately not named anywhere on
  the site. Keep it that way when adding or editing copy.
- Official contact email (shown in the footer): givingheartfoundation.ghf@gmail.com

## Still open

- **Resend domain:** `RESEND_FROM_EMAIL` is still `onboarding@resend.dev`
  (sandbox), which only delivers to the Resend account owner's address.
  Verify a real domain in Resend and update the from-address before admin
  replies can reach the public.
- **Paystack live keys:** the site is running on test keys until the client
  approves going live.
- **Phone number:** none is shown on the site yet.
- **Client review:** waiting on feedback and on the PDF content to be added.
