
-- Drop the overly permissive INSERT and UPDATE policies
DROP POLICY IF EXISTS "Authenticated users can insert company profiles" ON public.company_profiles;
DROP POLICY IF EXISTS "Authenticated users can update company profiles" ON public.company_profiles;

-- Replace with admin-only policies (edge functions use service role key which bypasses RLS)
CREATE POLICY "Only admins can insert company profiles"
  ON public.company_profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update company profiles"
  ON public.company_profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
