-- Scenario completions — paste into the Supabase SQL editor.
--
-- This table was previously created by hand and had no migration in the repo,
-- so its RLS posture was unverifiable. The browser writes it directly with the
-- PUBLIC anon key, which means RLS policies are the only thing preventing one
-- user from reading or modifying another user's rows.
--
-- This script is idempotent and safe to run on the existing table. It:
--   1. creates the table if it is missing;
--   2. removes rows orphaned by past account deletions;
--   3. guarantees the FK to auth.users with ON DELETE CASCADE, so deleting an
--      account really does erase its completions (as the privacy policy says);
--   4. enforces owner-only RLS.

-- 1. Table (no-op if it already exists) ---------------------------------------
create table if not exists public.completions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid not null,
  scenario_id text not null
);

-- Required for the client's upsert(onConflict: "user_id,scenario_id").
create unique index if not exists completions_user_scenario_key
  on public.completions (user_id, scenario_id);

-- 2. Clear orphans left by accounts deleted before the cascade existed --------
delete from public.completions c
where not exists (select 1 from auth.users u where u.id = c.user_id);

-- 3. Foreign key with cascade (dropped first so a non-cascading FK is fixed) --
alter table public.completions
  drop constraint if exists completions_user_id_fkey;

alter table public.completions
  add constraint completions_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- 4. Owner-only row level security -------------------------------------------
alter table public.completions enable row level security;

drop policy if exists "own rows select" on public.completions;
drop policy if exists "own rows insert" on public.completions;
drop policy if exists "own rows update" on public.completions;
drop policy if exists "own rows delete" on public.completions;

create policy "own rows select" on public.completions
  for select using (auth.uid() = user_id);

create policy "own rows insert" on public.completions
  for insert with check (auth.uid() = user_id);

create policy "own rows update" on public.completions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows delete" on public.completions
  for delete using (auth.uid() = user_id);

-- Verify: this should return rowsecurity = true
-- select relrowsecurity as rowsecurity from pg_class where oid = 'public.completions'::regclass;
