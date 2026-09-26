-- Personal séries: a user can ask for a new série. Séries are generated ahead of time into a pool
-- (status 'pool') and handed to a user on request (status 'published', owner_id set).

alter table public.bank_sets add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.bank_sets add column if not exists claimed_at timestamptz;
alter table public.bank_sets drop constraint if exists bank_sets_status_check;
alter table public.bank_sets add constraint bank_sets_status_check check (status in ('draft', 'pool', 'published'));
create index if not exists bank_sets_owner_idx on public.bank_sets (owner_id, skill);

drop policy if exists "bank sets readable when published" on public.bank_sets;
create policy "bank sets readable when published" on public.bank_sets
  for select to authenticated using (status = 'published' and (owner_id is null or owner_id = auth.uid()));

-- Requests waiting for the generator when the pool is empty.
create table if not exists public.bank_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill public.tcf_skill not null,
  status text not null default 'queued' check (status in ('queued', 'done', 'failed')),
  set_id uuid references public.bank_sets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bank_requests_queue_idx on public.bank_requests (status, created_at);
alter table public.bank_requests enable row level security;
drop policy if exists "own bank requests" on public.bank_requests;
create policy "own bank requests" on public.bank_requests for select to authenticated using (user_id = auth.uid());

-- Atomically hand the oldest pooled série to a user and title it after their own count ("Série 3").
create or replace function public.claim_pool_set(p_user uuid, p_skill public.tcf_skill)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_count int;
begin
  select id into v_id from bank_sets
  where status = 'pool' and skill = p_skill
  order by number
  limit 1
  for update skip locked;
  if v_id is null then
    return null;
  end if;
  select count(*) into v_count from bank_sets
  where skill = p_skill and status = 'published' and (owner_id is null or owner_id = p_user);
  update bank_sets
  set status = 'published', owner_id = p_user, claimed_at = now(), title = 'Série ' || (v_count + 1)
  where id = v_id;
  return v_id;
end;
$$;
revoke all on function public.claim_pool_set(uuid, public.tcf_skill) from public, anon, authenticated;
grant execute on function public.claim_pool_set(uuid, public.tcf_skill) to service_role;
