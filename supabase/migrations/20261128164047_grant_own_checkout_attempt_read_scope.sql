-- Allow authenticated users to inspect only the fields needed to manage their own checkout lock.
-- This enables DELETE predicates and INSERT ... RETURNING in acquire_checkout_attempt()
-- without exposing another user's checkout-attempt data.

GRANT SELECT (user_id, expires_at, attempt_id)
ON public.checkout_attempts
TO authenticated;

DROP POLICY IF EXISTS "Users read their own checkout attempt"
ON public.checkout_attempts;

CREATE POLICY "Users read their own checkout attempt"
ON public.checkout_attempts
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);
