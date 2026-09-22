CREATE TABLE IF NOT EXISTS public.guide_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  guide_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guide_follows_unique UNIQUE (follower_id, guide_id),
  CONSTRAINT guide_follows_not_self CHECK (follower_id <> guide_id)
);

CREATE INDEX IF NOT EXISTS guide_follows_guide_id_idx ON public.guide_follows (guide_id, created_at DESC);
CREATE INDEX IF NOT EXISTS guide_follows_follower_id_idx ON public.guide_follows (follower_id);

COMMENT ON TABLE public.guide_follows IS 'Tourist follows a guide for live stream email alerts.';
