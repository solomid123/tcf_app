-- Expression orale: original sujets for tâches 2 and 3, and recorded simulations with their evaluation.
create table if not exists public.eo_sujets (
  id         uuid primary key default gen_random_uuid(),
  task       smallint not null check (task in (2, 3)),
  prompt     text not null,               -- what the candidate reads / hears
  brief      text not null default '',    -- tâche 2: the examiner's role and facts to improvise from
  created_at timestamptz not null default now()
);
create index if not exists eo_sujets_task_idx on public.eo_sujets (task);
alter table public.eo_sujets enable row level security;   -- server-side only (no policies)

create table if not exists public.eo_attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  task2_id      uuid not null references public.eo_sujets(id),
  task3_id      uuid not null references public.eo_sujets(id),
  voice         text not null,
  avatar        text not null,
  status        text not null default 'created' check (status in ('created', 'live', 'recorded', 'graded', 'failed')),
  transcript    jsonb not null default '[]',
  evaluation    jsonb,
  score         smallint check (score between 0 and 20),
  attempt_id    uuid references public.attempts(id) on delete set null,
  created_at    timestamptz not null default now(),
  started_at    timestamptz,
  ended_at      timestamptz
);
create index if not exists eo_attempts_user_idx on public.eo_attempts (user_id, created_at desc);
alter table public.eo_attempts enable row level security;
drop policy if exists "EO attempts: read own" on public.eo_attempts;
create policy "EO attempts: read own" on public.eo_attempts
  for select to authenticated using ((select auth.uid()) = user_id);
