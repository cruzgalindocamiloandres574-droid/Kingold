alter table public.watch_progress
  add column if not exists track_index integer not null default 0
  check (track_index >= 0);
