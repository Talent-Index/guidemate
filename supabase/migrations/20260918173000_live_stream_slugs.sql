ALTER TABLE public.live_streams
  ADD COLUMN IF NOT EXISTS slug text;

DO $$
DECLARE
  r record;
  candidate text;
  n int;
  base text;
BEGIN
  FOR r IN
    SELECT id, title
    FROM public.live_streams
    WHERE slug IS NULL
    ORDER BY created_at, id
  LOOP
    base := public.guidemate_slugify(r.title);
    IF base IN ('live', 'new', 'item', 'stream') THEN
      base := base || '-stream';
    END IF;
    candidate := base;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM public.live_streams WHERE slug = candidate) LOOP
      n := n + 1;
      candidate := left(base, 50) || '-' || n::text;
    END LOOP;
    UPDATE public.live_streams SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS live_streams_slug_key
  ON public.live_streams (slug)
  WHERE slug IS NOT NULL;

COMMENT ON COLUMN public.live_streams.slug IS 'Vanity URL segment for /live/<slug>';
