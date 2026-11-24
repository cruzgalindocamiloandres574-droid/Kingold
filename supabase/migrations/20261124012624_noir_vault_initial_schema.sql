-- NOIR VAULT initial production schema
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);
create table public.movies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  synopsis text,
  genre text,
  release_year integer,
  poster_url text,
  playback_provider_id text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.watch_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  seconds_watched integer not null default 0 check (seconds_watched >= 0),
  updated_at timestamptz not null default now(),
  unique(user_id,movie_id)
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles(role);
create index movies_published_idx on public.movies(published);
create index watch_progress_user_updated_idx on public.watch_progress(user_id,updated_at desc);
create index subscriptions_user_created_idx on public.subscriptions(user_id,created_at desc);
alter table public.profiles enable row level security;
alter table public.movies enable row level security;
alter table public.watch_progress enable row level security;
alter table public.subscriptions enable row level security;
create policy "Profiles select own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Profiles update own display name" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Published movies readable" on public.movies for select to anon, authenticated using (published = true);
create policy "Progress select own" on public.watch_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "Progress insert own" on public.watch_progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Progress update own" on public.watch_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Progress delete own" on public.watch_progress for delete to authenticated using ((select auth.uid()) = user_id);
create policy "Subscriptions select own" on public.subscriptions for select to authenticated using ((select auth.uid()) = user_id);
grant usage on schema public to anon, authenticated;
grant select on public.movies to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select, insert, update, delete on public.watch_progress to authenticated;
grant select on public.subscriptions to authenticated;
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id) values (new.id);
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
