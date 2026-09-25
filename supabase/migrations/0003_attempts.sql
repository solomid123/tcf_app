-- Skills & modes
do $$ begin
  create type public.tcf_skill as enum ('CO', 'CE', 'EE', 'EO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attempt_mode as enum ('practice', 'exam');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sitting_status as enum ('in_progress', 'completed', 'abandoned');
exception when duplicate_object then null; end $$;

-- A full mock-exam sitting groups up to 4 épreuves
create table if not exists public.exam_sittings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  status       public.sitting_status not null default 'in_progress',
  overall_nclc smallint check (overall_nclc between 0 and 12),
  started_at   timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists exam_sittings_user_idx on public.exam_sittings (user_id, started_at desc);

-- One scored attempt at one skill (practice session or exam épreuve)
create table if not exists public.attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  sitting_id       uuid references public.exam_sittings(id) on delete cascade,
  mode             public.attempt_mode not null,
  skill            public.tcf_skill not null,
  score            numeric(6,2),          -- TCF scale: 100–699 (CO/CE) or 0–20 (EE/EO)
  percent          numeric(5,2) not null check (percent between 0 and 100),
  nclc             smallint check (nclc between 0 and 12),
  correct          integer,
  total            integer,
  duration_seconds integer,
  started_at       timestamptz not null default now(),
  completed_at     timestamptz not null default now(),
  constraint exam_attempts_need_sitting check (mode = 'practice' or sitting_id is not null)
);
create index if not exists attempts_user_idx on public.attempts (user_id, completed_at desc);

-- Read-only for users. Scores are written server-side only, so they can't be forged from the browser.
alter table public.exam_sittings enable row level security;
alter table public.attempts enable row level security;

drop policy if exists "Sittings: read own" on public.exam_sittings;
create policy "Sittings: read own" on public.exam_sittings
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Attempts: read own" on public.attempts;
create policy "Attempts: read own" on public.attempts
  for select to authenticated using ((select auth.uid()) = user_id);
