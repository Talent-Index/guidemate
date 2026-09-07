-- Guide availability slots for experiences (tourists book a specific time)

CREATE TABLE IF NOT EXISTS public.experience_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  guide_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  max_guests integer NOT NULL DEFAULT 6 CHECK (max_guests > 0),
  booked_guests integer NOT NULL DEFAULT 0 CHECK (booked_guests >= 0),
  is_cancelled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT experience_slots_capacity CHECK (booked_guests <= max_guests),
  CONSTRAINT experience_slots_time_order CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS experience_slots_experience_starts_idx
  ON public.experience_slots (experience_id, starts_at)
  WHERE NOT is_cancelled;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS slot_id uuid REFERENCES public.experience_slots(id);

CREATE INDEX IF NOT EXISTS bookings_slot_id_idx ON public.bookings (slot_id);

ALTER TABLE public.experience_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "experience_slots_public_read"
  ON public.experience_slots FOR SELECT
  USING (
    NOT is_cancelled
    AND starts_at > now()
    AND booked_guests < max_guests
    AND EXISTS (
      SELECT 1 FROM public.experiences e
      WHERE e.id = experience_id AND e.is_active = true
    )
  );

CREATE POLICY "experience_slots_guide_read"
  ON public.experience_slots FOR SELECT
  USING (guide_id = auth.uid());

CREATE POLICY "experience_slots_guide_insert"
  ON public.experience_slots FOR INSERT
  WITH CHECK (
    guide_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.experiences e
      WHERE e.id = experience_id AND e.guide_id = auth.uid()
    )
  );

CREATE POLICY "experience_slots_guide_update"
  ON public.experience_slots FOR UPDATE
  USING (guide_id = auth.uid());

CREATE POLICY "experience_slots_guide_delete"
  ON public.experience_slots FOR DELETE
  USING (guide_id = auth.uid());
