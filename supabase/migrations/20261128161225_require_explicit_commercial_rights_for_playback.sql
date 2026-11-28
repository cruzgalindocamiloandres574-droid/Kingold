-- Require explicit commercial reuse permission before exposing playable media.
-- Rows and source URLs remain intact for administrator review; only non-admin
-- SELECT access is restricted until the rights evidence is recorded.

DROP POLICY IF EXISTS "Playable media requires explicit commercial rights for anon"
  ON public.movies;

CREATE POLICY "Playable media requires explicit commercial rights for anon"
ON public.movies
AS RESTRICTIVE
FOR SELECT
TO anon
USING (
  (
    video_url IS NULL
    AND fallback_video_url IS NULL
    AND audio_url IS NULL
    AND (audio_tracks IS NULL OR audio_tracks = '[]'::jsonb)
    AND NULLIF(BTRIM(content_metadata->>'external_embed_url'), '') IS NULL
  )
  OR content_metadata->>'commercial_reuse_permitted' = 'true'
);

DROP POLICY IF EXISTS "Playable media requires explicit commercial rights for members"
  ON public.movies;

CREATE POLICY "Playable media requires explicit commercial rights for members"
ON public.movies
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  (SELECT private.is_admin())
  OR (
    (
      video_url IS NULL
      AND fallback_video_url IS NULL
      AND audio_url IS NULL
      AND (audio_tracks IS NULL OR audio_tracks = '[]'::jsonb)
      AND NULLIF(BTRIM(content_metadata->>'external_embed_url'), '') IS NULL
    )
    OR content_metadata->>'commercial_reuse_permitted' = 'true'
  )
);
