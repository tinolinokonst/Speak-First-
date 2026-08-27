-- ============================================================================
-- RUN THIS IN THE SUPABASE SQL EDITOR (Dashboard → SQL Editor → New query).
-- Nothing in the app creates tables; the signup consent gate will not be able
-- to record anything until this has been run.
-- Idempotent — safe to run more than once.
-- ============================================================================

create table if not exists public.user_consents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  consented_at   timestamptz not null default now(),
  policy_version text not null
);

-- One row per user per policy version. This is also what makes the app's
-- upsert(ignoreDuplicates) safe, so repeated sign-in events can't duplicate.
create unique index if not exists user_consents_user_version_key
  on public.user_consents (user_id, policy_version);

alter table public.user_consents enable row level security;

drop policy if exists "own consents select" on public.user_consents;
drop policy if exists "own consents insert" on public.user_consents;

-- A user may read only their own consent rows.
create policy "own consents select" on public.user_consents
  for select using (auth.uid() = user_id);

-- A user may record consent only for themselves.
create policy "own consents insert" on public.user_consents
  for insert with check (auth.uid() = user_id);

-- Deliberately NO update or delete policy: consent rows are append-only from
-- the client, so a user cannot alter or erase their own audit trail. Deleting
-- the account still removes them, via the cascade above.

-- Verify (expect rowsecurity = true):
-- select relrowsecurity as rowsecurity from pg_class where oid = 'public.user_consents'::regclass;
