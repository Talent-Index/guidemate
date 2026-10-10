-- Refer-a-guide: referral codes on profiles, attribution on applications, XP and reward claims.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referral_xp integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key
  ON public.profiles (lower(referral_code))
  WHERE referral_code IS NOT NULL;

COMMENT ON COLUMN public.profiles.referral_code IS 'Public code for /become-a-guide?ref=CODE vanity links';
COMMENT ON COLUMN public.profiles.referral_xp IS 'XP from qualified guide referrals; spend on reward claims';

ALTER TABLE public.guide_applications
  ADD COLUMN IF NOT EXISTS referrer_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_code text;

COMMENT ON COLUMN public.guide_applications.referrer_profile_id IS 'Signed-in member who referred this applicant';
COMMENT ON COLUMN public.guide_applications.referral_code IS 'Referral code captured at submit time';

CREATE TABLE IF NOT EXISTS public.guide_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  referred_guide_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  application_id uuid NOT NULL REFERENCES public.guide_applications (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'qualified', 'invalid')),
  xp_awarded integer NOT NULL DEFAULT 0,
  qualified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id)
);

CREATE INDEX IF NOT EXISTS guide_referrals_referrer_idx ON public.guide_referrals (referrer_profile_id);
CREATE INDEX IF NOT EXISTS guide_referrals_referred_guide_idx ON public.guide_referrals (referred_guide_id);

CREATE TABLE IF NOT EXISTS public.referral_reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  experience_id uuid NOT NULL REFERENCES public.experiences (id) ON DELETE RESTRICT,
  xp_spent integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'redeemed', 'cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_reward_claims_profile_idx ON public.referral_reward_claims (profile_id);

ALTER TABLE public.guide_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_reward_claims ENABLE ROW LEVEL SECURITY;

-- No client policies: backend service role manages referral rows.
