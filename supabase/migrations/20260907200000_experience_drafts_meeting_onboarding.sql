ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS wizard_step smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS meeting_lat double precision,
  ADD COLUMN IF NOT EXISTS meeting_lng double precision,
  ADD COLUMN IF NOT EXISTS meeting_label text;

ALTER TABLE public.experiences
  DROP CONSTRAINT IF EXISTS experiences_status_check;
ALTER TABLE public.experiences
  ADD CONSTRAINT experiences_status_check CHECK (status IN ('draft', 'published'));

ALTER TABLE public.experiences
  DROP CONSTRAINT IF EXISTS experiences_wizard_step_check;
ALTER TABLE public.experiences
  ADD CONSTRAINT experiences_wizard_step_check CHECK (wizard_step BETWEEN 1 AND 6);

ALTER TABLE public.experiences ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE public.experiences ALTER COLUMN is_active SET DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

CREATE INDEX IF NOT EXISTS experiences_public_list_idx
  ON public.experiences (created_at DESC)
  WHERE status = 'published' AND is_active = true;

DROP POLICY IF EXISTS experiences_public_read ON public.experiences;
CREATE POLICY experiences_public_read
  ON public.experiences FOR SELECT
  USING (
    (status = 'published' AND is_active = true)
    OR guide_id = auth.uid()
  );

DROP POLICY IF EXISTS experience_slots_public_read ON public.experience_slots;
CREATE POLICY experience_slots_public_read
  ON public.experience_slots FOR SELECT
  USING (
    NOT is_cancelled
    AND starts_at > now()
    AND booked_guests < max_guests
    AND EXISTS (
      SELECT 1 FROM public.experiences e
      WHERE e.id = experience_id
        AND e.is_active = true
        AND e.status = 'published'
    )
  );
