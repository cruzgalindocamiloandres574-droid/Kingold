create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text, role text not null default 'user' check (role in ('user','admin')), created_at timestamptz not null default now());
create table if not exists public.movies (id uuid primary key default gen_random_uuid(), title text not null, synopsis text, genre text, release_year integer, poster_url text, playback_provider_id text, published boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.watch_progress (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, movie_id uuid not null references public.movies(id) on delete cascade, seconds_watched integer not null default 0, updated_at timestamptz not null default now(), unique(user_id,movie_id));
alter table public.profiles enable row level security; alter table public.movies enable row level security; alter table public.watch_progress enable row level security;
create policy "Users read own profile" on public.profiles for select using (auth.uid()=id);
create policy "Published movies visible" on public.movies for select using (published=true);
create policy "Users manage own progress" on public.watch_progress for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id) values(new.id); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users; create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
