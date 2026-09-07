-- Restrict client-side profile creation to tourist role only.
-- Guide profiles are created by the backend (service role) after admin approval.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own_tourist ON public.profiles;

CREATE POLICY profiles_insert_own_tourist
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND role = 'tourist');
