-- Run this in the Supabase SQL editor to set up the tables this site needs.

create table if not exists donations (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  donor_name text,
  donor_email text,
  amount_kobo integer not null,
  amount_naira numeric not null,
  currency text default 'NGN',
  paystack_status text,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz default now()
);

-- Row Level Security: lock both tables down from the client.
-- All reads/writes go through the server-side API routes using the
-- service_role key, which bypasses RLS — so these policies just make
-- sure no one can read/write directly from the browser using the anon key.
alter table donations enable row level security;
alter table contact_messages enable row level security;
