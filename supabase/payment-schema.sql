-- Apply after schema.sql in the Supabase SQL editor. Billing writes must only
-- use the server-side service-role key; browser roles have read-only access.
create table if not exists public.resume_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  profile jsonb not null check (jsonb_typeof(profile) = 'object' and octet_length(profile::text) <= 120000),
  locale text not null check (locale in ('en', 'pl')),
  created_at timestamptz not null default now(),
  unique (user_id, fingerprint),
  unique (id, user_id)
);

create table if not exists public.resume_orders (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  currency text not null check (currency in ('pln', 'usd', 'eur')),
  amount integer not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'refunded', 'disputed')),
  checkout_session_id text unique,
  payment_intent_id text unique,
  generation integer not null default 1 check (generation > 0),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  foreign key (resume_id, user_id) references public.resume_snapshots(id, user_id) on delete cascade,
  check ((currency = 'pln' and amount = 500) or (currency = 'usd' and amount = 125) or (currency = 'eur' and amount = 115))
);

alter table public.resume_snapshots enable row level security;
alter table public.resume_orders enable row level security;
revoke all on public.resume_snapshots, public.resume_orders from public, anon, authenticated;
grant select on public.resume_snapshots, public.resume_orders to authenticated;
grant select, insert, update, delete on public.resume_snapshots, public.resume_orders to service_role;
drop policy if exists "Read own purchased snapshots" on public.resume_snapshots;
create policy "Read own purchased snapshots" on public.resume_snapshots for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Read own resume orders" on public.resume_orders;
create policy "Read own resume orders" on public.resume_orders for select to authenticated using ((select auth.uid()) = user_id);

-- A purchased snapshot never follows later edits to a profile.
create or replace function public.prevent_resume_snapshot_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Resume snapshots are immutable';
end;
$$;
drop trigger if exists immutable_resume_snapshot on public.resume_snapshots;
create trigger immutable_resume_snapshot before update on public.resume_snapshots for each row execute function public.prevent_resume_snapshot_update();

-- Both webhook delivery and the signed-in success page can safely call this.
-- Row locking makes duplicate delivery idempotent and revocation permanent.
create or replace function public.fulfill_resume_order(target_order_id uuid, stripe_session_id text, stripe_payment_intent_id text, expected_generation integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare purchase public.resume_orders;
begin
  select * into purchase from public.resume_orders where id = target_order_id for update;
  if not found or purchase.status in ('refunded', 'disputed') or purchase.generation <> expected_generation then return false; end if;
  if purchase.checkout_session_id is not null and purchase.checkout_session_id <> stripe_session_id then return false; end if;
  if purchase.payment_intent_id is not null and purchase.payment_intent_id <> stripe_payment_intent_id then return false; end if;
  update public.resume_orders set status = 'paid', checkout_session_id = stripe_session_id,
    payment_intent_id = stripe_payment_intent_id, paid_at = coalesce(paid_at, now()) where id = target_order_id;
  return true;
end;
$$;

create or replace function public.revoke_resume_order(target_order_id uuid, stripe_payment_intent_id text, reversal_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if reversal_status not in ('refunded', 'disputed') then raise exception 'Invalid reversal'; end if;
  update public.resume_orders set status = reversal_status, payment_intent_id = stripe_payment_intent_id
    where id = target_order_id and (payment_intent_id is null or payment_intent_id = stripe_payment_intent_id);
end;
$$;

-- Only the server calls this after Stripe confirms that the old session expired.
create or replace function public.renew_resume_checkout(target_order_id uuid, expected_generation integer, new_currency text, new_amount integer)
returns public.resume_orders language plpgsql security definer set search_path = '' as $$
declare purchase public.resume_orders;
begin
  select * into purchase from public.resume_orders where id = target_order_id for update;
  if purchase.status = 'pending' and purchase.generation = expected_generation then
    update public.resume_orders set generation = generation + 1, checkout_session_id = null,
      currency = new_currency, amount = new_amount where id = target_order_id returning * into purchase;
  end if;
  return purchase;
end;
$$;

revoke all on function public.fulfill_resume_order(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.revoke_resume_order(uuid, text, text) from public, anon, authenticated;
revoke all on function public.renew_resume_checkout(uuid, integer, text, integer) from public, anon, authenticated;
grant execute on function public.fulfill_resume_order(uuid, text, text, integer) to service_role;
grant execute on function public.revoke_resume_order(uuid, text, text) to service_role;
grant execute on function public.renew_resume_checkout(uuid, integer, text, integer) to service_role;

create or replace function public.consume_checkout_rate_limit()
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  bucket timestamptz := date_trunc('hour', now());
  request_count integer;
begin
  if current_user_id is null then return false; end if;
  insert into public.request_quotas (user_id, action, window_start, count)
    values (current_user_id, 'checkout', bucket, 1)
    on conflict (user_id, action) do update
      set count = case when public.request_quotas.window_start = bucket then least(public.request_quotas.count + 1, 31) else 1 end,
        window_start = bucket
    returning count into request_count;
  return request_count <= 30;
end;
$$;
revoke all on function public.consume_checkout_rate_limit() from public, anon;
grant execute on function public.consume_checkout_rate_limit() to authenticated;
