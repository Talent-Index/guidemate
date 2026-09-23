-- Track when a welcome email was sent so each account only receives one.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcomed_at timestamptz;

COMMENT ON COLUMN public.profiles.welcomed_at IS 'Timestamp the one-time welcome email was sent to this account.';
