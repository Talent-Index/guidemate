-- Guide profile photo + experience itinerary (guide-authored "What you'll do")

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.profiles.avatar_url IS 'Public URL for guide profile photo in experience-photos bucket';

ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS itinerary jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.experiences.itinerary IS 'Array of {title, body, image_url} steps for What you will do';
