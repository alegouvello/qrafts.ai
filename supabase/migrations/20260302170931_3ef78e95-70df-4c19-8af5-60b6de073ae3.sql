
-- Cached company profile data (auto-fetched)
CREATE TABLE public.company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  domain text,
  description text,
  industry text,
  size text,
  headquarters text,
  website_url text,
  linkedin_url text,
  careers_url text,
  logo_url text,
  fetched_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_name)
);

ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read cached company profiles
CREATE POLICY "Authenticated users can view company profiles"
  ON public.company_profiles FOR SELECT TO authenticated
  USING (true);

-- Only edge functions (service role) insert/update, but allow authenticated insert for fallback
CREATE POLICY "Authenticated users can insert company profiles"
  ON public.company_profiles FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update company profiles"
  ON public.company_profiles FOR UPDATE TO authenticated
  USING (true);

-- Community experiences sharing
CREATE TABLE public.company_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  experience_text text NOT NULL,
  experience_type text NOT NULL DEFAULT 'interview', -- interview, culture, process, tip
  rating integer CHECK (rating >= 1 AND rating <= 5),
  is_anonymous boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.company_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all experiences"
  ON public.company_experiences FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create their own experiences"
  ON public.company_experiences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own experiences"
  ON public.company_experiences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own experiences"
  ON public.company_experiences FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_company_profiles_updated_at
  BEFORE UPDATE ON public.company_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_experiences_updated_at
  BEFORE UPDATE ON public.company_experiences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
