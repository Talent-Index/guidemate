ALTER TABLE public.guide_applications
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text;

COMMENT ON COLUMN public.guide_applications.utm_source IS 'Marketing utm_source when the application was submitted';
COMMENT ON COLUMN public.guide_applications.utm_medium IS 'Marketing utm_medium when the application was submitted';
COMMENT ON COLUMN public.guide_applications.utm_campaign IS 'Marketing utm_campaign when the application was submitted';
