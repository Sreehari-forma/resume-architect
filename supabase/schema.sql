-- Run once in the Supabase SQL editor. All browser access uses the public anon key
-- plus the signed-in user's JWT; no service-role key is needed by this app.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 120000),
  updated_at timestamptz not null default now()
);

create table if not exists public.tailored_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 250000),
  created_at timestamptz not null default now()
);
create index if not exists tailored_resumes_owner_date on public.tailored_resumes(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.tailored_resumes enable row level security;

drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Create own profile" on public.profiles;
create policy "Create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Delete own profile" on public.profiles;
create policy "Delete own profile" on public.profiles for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Read own resumes" on public.tailored_resumes;
create policy "Read own resumes" on public.tailored_resumes for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Create own resumes" on public.tailored_resumes;
create policy "Create own resumes" on public.tailored_resumes for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Delete own resumes" on public.tailored_resumes;
create policy "Delete own resumes" on public.tailored_resumes for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.profiles, public.tailored_resumes from anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, delete on public.tailored_resumes to authenticated;

-- Atomic, shared across application instances. Clients cannot edit quota rows.
create table if not exists public.request_quotas (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (user_id, action)
);
alter table public.request_quotas enable row level security;
revoke all on public.request_quotas from anon, authenticated;

create or replace function public.consume_rate_limit(action_name text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  bucket timestamptz := date_trunc('hour', now());
  request_count integer;
  request_limit integer;
begin
  if current_user_id is null then return false; end if;
  if action_name = 'tailor' then request_limit := 10;
  elsif action_name = 'extract' then request_limit := 30;
  else return false;
  end if;

  insert into public.request_quotas (user_id, action, window_start, count)
  values (current_user_id, action_name, bucket, 1)
  on conflict (user_id, action) do update
    set count = case when public.request_quotas.window_start = bucket
      then least(public.request_quotas.count + 1, request_limit + 1) else 1 end,
      window_start = bucket
  returning count into request_count;
  return request_count <= request_limit;
end;
$$;
revoke all on function public.consume_rate_limit(text) from public, anon;
grant execute on function public.consume_rate_limit(text) to authenticated;
