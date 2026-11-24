drop policy if exists "Users can read their own subscriptions" on public.subscriptions;
drop index if exists public.subscriptions_user_id_created_at_idx;
create index if not exists watch_progress_movie_id_idx on public.watch_progress(movie_id);
