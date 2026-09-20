ALTER TABLE public.live_streams
  ADD COLUMN IF NOT EXISTS peak_viewer_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.stream_join_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams (id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  viewer_identity text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stream_join_events_stream_id_idx
  ON public.stream_join_events (stream_id, joined_at DESC);

CREATE INDEX IF NOT EXISTS stream_join_events_stream_identity_idx
  ON public.stream_join_events (stream_id, viewer_identity);

COMMENT ON TABLE public.stream_join_events IS 'Viewer join events for live stream analytics (unique + total counts).';
