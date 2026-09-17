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
  created_at timestamptz default now(),
  last_reply_body text,
  last_reply_sent_at timestamptz
);

-- Idempotency guard for reply-message.ts: lets the API tell a genuine
-- duplicate request (double-click, duplicate render, client retry, etc.)
-- apart from a real second reply, without relying on the client alone.
alter table contact_messages
  add column if not exists last_reply_body text,
  add column if not exists last_reply_sent_at timestamptz;

-- Every reply the admin sends to a contact message, so the dashboard can
-- show the full back-and-forth rather than just the most recent reply.
create table if not exists message_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references contact_messages(id) on delete cascade,
  body text not null,
  sent_at timestamptz default now()
);

-- Row Level Security: lock all three tables down from the client.
-- Inserts go through the server-side API routes using the service_role key,
-- which bypasses RLS. Reads for the admin dashboard go through the anon key
-- from the browser, so we explicitly allow SELECT only for logged-in users.
alter table donations enable row level security;
alter table contact_messages enable row level security;
alter table message_replies enable row level security;

create policy "Authenticated users can read donations"
  on donations for select
  to authenticated
  using (true);

create policy "Authenticated users can read contact_messages"
  on contact_messages for select
  to authenticated
  using (true);

create policy "Authenticated users can delete contact_messages"
  on contact_messages for delete
  to authenticated
  using (true);

create policy "Authenticated users can read message_replies"
  on message_replies for select
  to authenticated
  using (true);

-- Enable Realtime so the admin dashboard gets live updates on new rows
alter publication supabase_realtime add table donations;
alter publication supabase_realtime add table contact_messages;
alter publication supabase_realtime add table message_replies;
