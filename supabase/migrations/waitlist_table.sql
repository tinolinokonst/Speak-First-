-- Mobile app waitlist — paste into the Supabase SQL editor.
--
-- Written ONLY through /api/waitlist (service role key, server-side).
-- RLS is enabled with NO policies: the browser's anon key can neither read
-- nor write this table; the service role bypasses RLS.

create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email      text not null unique,
  source     text default 'landing_page',
  consent    boolean not null default false
);

alter table public.waitlist enable row level security;
