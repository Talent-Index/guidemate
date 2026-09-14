-- Guides choose whether completed-tour earnings go to M-Pesa or stay in-wallet.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payout_destination text NOT NULL DEFAULT 'mpesa';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_payout_destination_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_payout_destination_check
  CHECK (payout_destination IN ('mpesa', 'wallet'));

ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS payout_destination text;

ALTER TABLE public.experiences
  DROP CONSTRAINT IF EXISTS experiences_payout_destination_check;
ALTER TABLE public.experiences
  ADD CONSTRAINT experiences_payout_destination_check
  CHECK (payout_destination IS NULL OR payout_destination IN ('mpesa', 'wallet'));

COMMENT ON COLUMN public.profiles.payout_destination IS 'Default after a completed tour: auto M-Pesa or hold in Guidemate wallet';
COMMENT ON COLUMN public.experiences.payout_destination IS 'Optional override of the guide profile payout destination; null inherits the profile default';
