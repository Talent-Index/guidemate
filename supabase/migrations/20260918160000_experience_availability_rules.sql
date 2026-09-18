-- Recurring weekly availability templates → materialized experience_slots

CREATE TABLE IF NOT EXISTS public.experience_availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  guide_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time time NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 720),
  max_guests integer NOT NULL DEFAULT 6 CHECK (max_guests > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT experience_availability_rules_unique UNIQUE (experience_id, weekday, start_time)
);

CREATE INDEX IF NOT EXISTS experience_availability_rules_experience_idx
  ON public.experience_availability_rules (experience_id);

ALTER TABLE public.experience_slots
  ADD COLUMN IF NOT EXISTS rule_id uuid REFERENCES public.experience_availability_rules(id) ON DELETE CASCADE;

ALTER TABLE public.experience_availability_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_rules_public_read"
  ON public.experience_availability_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.experiences e
      WHERE e.id = experience_id AND e.is_active = true
    )
  );

CREATE POLICY "availability_rules_guide_read"
  ON public.experience_availability_rules FOR SELECT
  USING (guide_id = auth.uid());

CREATE POLICY "availability_rules_guide_insert"
  ON public.experience_availability_rules FOR INSERT
  WITH CHECK (
    guide_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.experiences e
      WHERE e.id = experience_id AND e.guide_id = auth.uid()
    )
  );

CREATE POLICY "availability_rules_guide_update"
  ON public.experience_availability_rules FOR UPDATE
  USING (guide_id = auth.uid());

CREATE POLICY "availability_rules_guide_delete"
  ON public.experience_availability_rules FOR DELETE
  USING (guide_id = auth.uid());

COMMENT ON TABLE public.experience_availability_rules IS 'Weekly EAT schedule; synced to experience_slots for booking';
COMMENT ON COLUMN public.experience_availability_rules.weekday IS '0=Sunday … 6=Saturday (East Africa calendar)';
