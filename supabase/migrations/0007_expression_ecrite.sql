-- Expression écrite: original sujets for the 3 tâches, and written épreuves with their evaluation.
create table if not exists public.ee_sujets (
  id         uuid primary key default gen_random_uuid(),
  task       smallint not null check (task in (1, 2, 3)),
  prompt     text not null,                -- the consigne the candidate reads
  documents  jsonb not null default '[]',  -- tâche 3: the two short documents with opposing views [{title, text}]
  created_at timestamptz not null default now()
);
create index if not exists ee_sujets_task_idx on public.ee_sujets (task);
alter table public.ee_sujets enable row level security;   -- server-side only (no policies)

create table if not exists public.ee_attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  task1_id      uuid not null references public.ee_sujets(id),
  task2_id      uuid not null references public.ee_sujets(id),
  task3_id      uuid not null references public.ee_sujets(id),
  status        text not null default 'writing' check (status in ('writing', 'submitted', 'graded', 'failed')),
  answers       jsonb not null default '["", "", ""]',
  evaluation    jsonb,
  score         smallint check (score between 0 and 20),
  attempt_id    uuid references public.attempts(id) on delete set null,
  created_at    timestamptz not null default now(),
  submitted_at  timestamptz
);
create index if not exists ee_attempts_user_idx on public.ee_attempts (user_id, created_at desc);
alter table public.ee_attempts enable row level security;
drop policy if exists "EE attempts: read own" on public.ee_attempts;
create policy "EE attempts: read own" on public.ee_attempts
  for select to authenticated using ((select auth.uid()) = user_id);

-- The writing surface shown to the candidate (a form, an email reply, a message, an article), as in the real épreuve:
-- {kind: 'form'|'email'|'message'|'article', title, to, subject}. documents holds the stimulus: the email received
-- (tâche 2) or the two documents (tâche 3), [{title, from, subject, text, source}].
alter table public.ee_sujets add column if not exists sheet jsonb not null default '{}';
