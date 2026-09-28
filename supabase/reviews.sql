-- Run this once in the Supabase SQL editor to add the visitor reviews feature.
-- (It is also appended to schema.sql for fresh setups.)

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rating smallint check (rating between 1 and 5),
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now(),
  reviewed_at timestamptz
);

-- Visitors never touch this table directly. Submissions go through
-- /api/submit-review and the public list through /api/reviews, both using the
-- service_role key. Only signed-in admins can read, moderate and delete.
alter table reviews enable row level security;

create policy "Authenticated users can read reviews"
  on reviews for select
  to authenticated
  using (true);

create policy "Authenticated users can update reviews"
  on reviews for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete reviews"
  on reviews for delete
  to authenticated
  using (true);

-- Live updates in the admin dashboard when a new review comes in
alter publication supabase_realtime add table reviews;
