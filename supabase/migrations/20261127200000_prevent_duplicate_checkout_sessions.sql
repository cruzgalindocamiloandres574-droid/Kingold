-- Prevent duplicate Stripe Checkout Sessions for the same authenticated NOIR VAULT user.
-- The lock is private to each user, is only writable through their own row,
-- and expires shortly after the corresponding Stripe Checkout Session.

create table if not exists public.checkout_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table public.checkout_attempts is
  'Short-lived per-user lock preventing concurrent duplicate Stripe Checkout Sessions.';

alter table public.checkout_attempts enable row level security;

revoke all on public.checkout_attempts from anon, authenticated;
grant insert, delete on public.checkout_attempts to authenticated;

drop policy if exists "Users acquire their own checkout attempt" on public.checkout_attempts;
create policy "Users acquire their own checkout attempt"
on public.checkout_attempts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users release their own checkout attempt" on public.checkout_attempts;
create policy "Users release their own checkout attempt"
on public.checkout_attempts
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.acquire_checkout_attempt()
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_acquired_user_id uuid;
begin
  if v_user_id is null then
    return false;
  end if;

  -- Remove this user's expired lock first. Concurrent inserts are serialized
  -- by the primary key, and ON CONFLICT DO NOTHING lets only one request win.
  delete from public.checkout_attempts
  where user_id = v_user_id
    and expires_at <= pg_catalog.now();

  insert into public.checkout_attempts (user_id, expires_at)
  values (v_user_id, pg_catalog.now() + interval '32 minutes')
  on conflict (user_id) do nothing
  returning user_id into v_acquired_user_id;

  return v_acquired_user_id is not null;
end;
$$;

revoke all on function public.acquire_checkout_attempt() from public, anon;
grant execute on function public.acquire_checkout_attempt() to authenticated;
