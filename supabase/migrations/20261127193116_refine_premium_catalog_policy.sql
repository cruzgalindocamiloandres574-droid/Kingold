DROP POLICY IF EXISTS "Admins read all movies" ON public.movies;
DROP POLICY IF EXISTS "Published movies readable to members" ON public.movies;

CREATE POLICY "Published movies readable to members"
ON public.movies
FOR SELECT
TO authenticated
USING (
  (SELECT private.is_admin())
  OR (
    published = true
    AND (
      requires_premium = false
      OR EXISTS (
        SELECT 1
        FROM public.subscriptions AS s
        WHERE s.user_id = (SELECT auth.uid())
          AND s.status IN ('active', 'trialing')
          AND s.current_period_end > now()
      )
    )
  )
);
