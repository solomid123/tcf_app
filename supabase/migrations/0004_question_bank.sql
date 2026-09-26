-- Question bank: original, AI-generated épreuves in the official TCF Canada format.
-- A "set" is one complete épreuve (39 questions for CO/CE).

create table if not exists public.bank_sets (
  id uuid primary key default gen_random_uuid(),
  skill public.tcf_skill not null,
  number int not null,                       -- "Série 1", "Série 2", ...
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  unique (skill, number)
);

create table if not exists public.bank_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.bank_sets(id) on delete cascade,
  position int not null check (position between 1 and 39),
  level text not null check (level in ('A1','A2','B1','B2','C1','C2')),
  points int not null,
  kind text not null,                        -- image_description | spoken_response | short_document | long_document
  instruction text not null,
  question text,                             -- null when the question is only heard
  options jsonb not null,                    -- 4 strings (spoken-only options are still stored for review)
  options_spoken boolean not null default false,
  answer smallint not null check (answer between 0 and 3),
  explanation text not null,
  transcript jsonb not null,                 -- [{ speaker, voice, text }]
  audio_path text,
  image_path text,
  created_at timestamptz not null default now(),
  unique (set_id, position)
);

create index if not exists bank_items_set_idx on public.bank_items (set_id, position);

-- Items carry the answer key, so no client access at all: the server reads them with the secret key.
alter table public.bank_sets enable row level security;
alter table public.bank_items enable row level security;

drop policy if exists "bank sets readable when published" on public.bank_sets;
create policy "bank sets readable when published" on public.bank_sets
  for select to authenticated using (status = 'published');

-- Per-question answers of an attempt, for the review screen.
alter table public.attempts add column if not exists set_id uuid references public.bank_sets(id) on delete set null;
alter table public.attempts add column if not exists details jsonb;

-- Public bucket for generated audio and pictures (original content, safe to serve directly).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bank', 'bank', true, 10485760, array['audio/mpeg', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
