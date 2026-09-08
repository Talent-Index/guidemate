-- Draft autosave sends price/duration before the guide finishes step 3.
-- Allow zero while editing; publish checks still require price > 0 in the app.

ALTER TABLE public.experiences DROP CONSTRAINT IF EXISTS experiences_duration_minutes_check;
ALTER TABLE public.experiences DROP CONSTRAINT IF EXISTS experiences_price_usdc_check;

ALTER TABLE public.experiences
  ADD CONSTRAINT experiences_duration_minutes_check CHECK (duration_minutes >= 0);

ALTER TABLE public.experiences
  ADD CONSTRAINT experiences_price_usdc_check CHECK (price_usdc >= 0);

ALTER TABLE public.experiences
  ALTER COLUMN duration_minutes SET DEFAULT 0;
