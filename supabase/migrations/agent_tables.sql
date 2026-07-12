-- Marketing agent tables — paste into the Supabase SQL editor.
--
-- These tables are written ONLY by the server-side agent (api/agent-run.js)
-- using the service role key. RLS is enabled with no policies, which means
-- the anon/authenticated keys used by the browser can neither read nor write
-- them; the service role bypasses RLS.

-- ── Research findings from the Monday competitor sweep ───────────────────────
create table if not exists public.agent_research (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  competitor   text,
  channel      text,
  finding      text,
  source_url   text,
  tactic_score int check (tactic_score between 1 and 5) -- how replicable/cheap it is
);

-- ── Content drafts generated daily ────────────────────────────────────────────
create table if not exists public.agent_drafts (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  channel           text check (channel in ('tiktok','reels','x')),
  draft_type        text,            -- e.g. 'script', 'post', 'hook', 'thread'
  content           text,
  based_on_research uuid references public.agent_research(id),
  status            text default 'proposed'
);

-- ── Run log — one row per job execution (success or failure) ─────────────────
create table if not exists public.agent_log (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_type   text,  -- 'research' | 'drafts' | 'daily_email' | 'weekly_email'
  summary    text
);

-- Lock the tables to the service role only (no policies = no anon/auth access).
alter table public.agent_research enable row level security;
alter table public.agent_drafts   enable row level security;
alter table public.agent_log      enable row level security;
