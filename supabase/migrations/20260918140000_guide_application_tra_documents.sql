ALTER TABLE public.guide_applications
  ADD COLUMN IF NOT EXISTS national_id_doc_path text,
  ADD COLUMN IF NOT EXISTS good_conduct_doc_path text,
  ADD COLUMN IF NOT EXISTS kra_pin text,
  ADD COLUMN IF NOT EXISTS kra_pin_doc_path text,
  ADD COLUMN IF NOT EXISTS professional_certificate_paths text[] DEFAULT '{}';

COMMENT ON COLUMN public.guide_applications.national_id_doc_path IS 'Scan/photo of National ID in guide-proofs bucket';
COMMENT ON COLUMN public.guide_applications.good_conduct_doc_path IS 'Certificate of Good Conduct (TRA Class E)';
COMMENT ON COLUMN public.guide_applications.kra_pin IS 'Kenya Revenue Authority PIN';
COMMENT ON COLUMN public.guide_applications.kra_pin_doc_path IS 'KRA PIN certificate upload';
COMMENT ON COLUMN public.guide_applications.professional_certificate_paths IS 'Tourism/guide professional certificates (TRA Class E)';
