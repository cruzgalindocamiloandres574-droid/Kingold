create table if not exists public.subscriptions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, stripe_customer_id text, stripe_subscription_id text unique, status text not null, current_period_end timestamptz, created_at timestamptz not null default now());
alter table public.subscriptions enable row level security;
create policy "Users can view own subscription" on public.subscriptions for select using (auth.uid()=user_id);
