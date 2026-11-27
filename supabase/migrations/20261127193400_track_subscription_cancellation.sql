ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancel_at timestamptz,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz;

COMMENT ON COLUMN public.subscriptions.cancel_at_period_end IS
  'Stripe flag indicating that a subscription is scheduled to cancel at the end of its billing period.';
COMMENT ON COLUMN public.subscriptions.cancel_at IS
  'Stripe timestamp at which a subscription is scheduled to cancel, when applicable.';
COMMENT ON COLUMN public.subscriptions.canceled_at IS
  'Stripe timestamp when the subscription was actually canceled.';
