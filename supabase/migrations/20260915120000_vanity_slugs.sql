-- Vanity URLs: /e/<experience-slug> and /g/<guide-slug>

ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS slug text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.guidemate_slugify(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(
      left(
        trim(both '-' from regexp_replace(lower(trim(coalesce(input, ''))), '[^a-z0-9]+', '-', 'g')),
        60
      ),
      ''
    ),
    'item'
  );
$$;

DO $$
DECLARE
  r record;
  candidate text;
  n int;
  base text;
BEGIN
  FOR r IN
    SELECT id, title
    FROM public.experiences
    WHERE slug IS NULL
    ORDER BY created_at, id
  LOOP
    base := public.guidemate_slugify(r.title);
    IF base IN ('new', 'edit', 'e', 'g', 'item') THEN
      base := base || '-experience';
    END IF;
    candidate := base;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM public.experiences WHERE slug = candidate) LOOP
      n := n + 1;
      candidate := left(base, 50) || '-' || n::text;
    END LOOP;
    UPDATE public.experiences SET slug = candidate WHERE id = r.id;
  END LOOP;

  FOR r IN
    SELECT id, full_name
    FROM public.profiles
    WHERE role = 'guide' AND slug IS NULL
    ORDER BY created_at, id
  LOOP
    base := public.guidemate_slugify(r.full_name);
    IF base IN ('new', 'edit', 'me', 'admin', 'guide', 'guides', 'g', 'e') THEN
      base := base || '-guide';
    END IF;
    candidate := base;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = candidate) LOOP
      n := n + 1;
      candidate := left(base, 50) || '-' || n::text;
    END LOOP;
    UPDATE public.profiles SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

UPDATE public.profiles
SET slug = 'immaculate-munde'
WHERE id = 'ce4095eb-bdf1-49e3-aec5-97e5d0979f70'
  AND (slug IS DISTINCT FROM 'immaculate-munde')
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.slug = 'immaculate-munde' AND p.id <> 'ce4095eb-bdf1-49e3-aec5-97e5d0979f70'
  );

CREATE UNIQUE INDEX IF NOT EXISTS experiences_slug_key
  ON public.experiences (slug)
  WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_slug_key
  ON public.profiles (slug)
  WHERE slug IS NOT NULL;

COMMENT ON COLUMN public.experiences.slug IS 'Public vanity path segment for /e/<slug>';
COMMENT ON COLUMN public.profiles.slug IS 'Public vanity path segment for /g/<slug> (guides)';
