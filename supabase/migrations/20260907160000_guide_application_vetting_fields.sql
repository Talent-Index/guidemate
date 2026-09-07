ALTER TABLE public.guide_applications
  ADD COLUMN IF NOT EXISTS id_number text,
  ADD COLUMN IF NOT EXISTS cv_path text,
  ADD COLUMN IF NOT EXISTS referee_name text,
  ADD COLUMN IF NOT EXISTS referee_phone text,
  ADD COLUMN IF NOT EXISTS referee_email text;

COMMENT ON COLUMN public.guide_applications.id_number IS 'National ID or passport number for vetting';
COMMENT ON COLUMN public.guide_applications.cv_path IS 'Storage path in guide-proofs bucket for uploaded CV';
COMMENT ON COLUMN public.guide_applications.referee_name IS 'Person who can vouch for the applicant';
COMMENT ON COLUMN public.guide_applications.referee_phone IS 'Referee contact phone';
COMMENT ON COLUMN public.guide_applications.referee_email IS 'Optional referee email';
