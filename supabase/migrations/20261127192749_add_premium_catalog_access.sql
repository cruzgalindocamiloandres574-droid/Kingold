ALTER TABLE public.movies
  ADD COLUMN IF NOT EXISTS requires_premium boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.movies.requires_premium IS
  'When true, only authenticated users with an active/trialing subscription (or admins) may read this catalogue row.';

DROP POLICY IF EXISTS "Published movies readable" ON public.movies;
DROP POLICY IF EXISTS "Published free movies readable" ON public.movies;
DROP POLICY IF EXISTS "Published movies readable to members" ON public.movies;
DROP POLICY IF EXISTS "Admins read all movies" ON public.movies;

CREATE POLICY "Published free movies readable"
ON public.movies
FOR SELECT
TO anon
USING (published = true AND requires_premium = false);

CREATE POLICY "Published movies readable to members"
ON public.movies
FOR SELECT
TO authenticated
USING (
  published = true
  AND (
    requires_premium = false
    OR (SELECT private.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.subscriptions AS s
      WHERE s.user_id = (SELECT auth.uid())
        AND s.status IN ('active', 'trialing')
        AND s.current_period_end > now()
    )
  )
);

CREATE POLICY "Admins read all movies"
ON public.movies
FOR SELECT
TO authenticated
USING ((SELECT private.is_admin()));
