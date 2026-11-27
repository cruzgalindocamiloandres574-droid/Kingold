-- Bind each Checkout lock to a unique attempt so delayed Stripe webhooks
-- cannot release a newer session started by the same user.

alter table public.checkout_attempts
  add column if not exists attempt_id uuid not null default gen_random_uuid();

drop function if exists public.acquire_checkout_attempt();

create function public.acquire_checkout_attempt()
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_attempt_id uuid := gen_random_uuid();
  v_acquired_attempt_id uuid;
begin
  if v_user_id is null then
    return null;
  end if;

  delete from public.checkout_attempts
  where user_id = v_user_id
    and expires_at <= pg_catalog.now();

  insert into public.checkout_attempts (user_id, attempt_id, expires_at)
  values (v_user_id, v_attempt_id, pg_catalog.now() + interval '32 minutes')
  on conflict (user_id) do nothing
  returning attempt_id into v_acquired_attempt_id;

  return v_acquired_attempt_id;
end;
$$;

revoke all on function public.acquire_checkout_attempt() from public, anon;
grant execute on function public.acquire_checkout_attempt() to authenticated;
