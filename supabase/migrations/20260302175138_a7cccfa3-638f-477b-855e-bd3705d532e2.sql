
-- Table to store crawled job openings
CREATE TABLE public.job_openings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  title text NOT NULL,
  url text,
  location text,
  department text,
  description_snippet text,
  first_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_name, title, url)
);

ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;

-- Public read for authenticated users
CREATE POLICY "Authenticated users can view job openings"
  ON public.job_openings FOR SELECT
  TO authenticated
  USING (true);

-- Only edge functions (service role) insert/update
-- No user-level insert/update/delete policies needed

-- Table to store per-user match scores for job openings
CREATE TABLE public.job_match_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_opening_id uuid NOT NULL REFERENCES public.job_openings(id) ON DELETE CASCADE,
  match_score integer NOT NULL DEFAULT 0,
  match_reasons text[],
  alerted boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_opening_id)
);

ALTER TABLE public.job_match_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own match scores"
  ON public.job_match_scores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Table for users to watch companies for job alerts
CREATE TABLE public.company_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_name)
);

ALTER TABLE public.company_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watchlist"
  ON public.company_watchlist FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their watchlist"
  ON public.company_watchlist FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their watchlist"
  ON public.company_watchlist FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_job_openings_updated_at
  BEFORE UPDATE ON public.job_openings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_match_scores_updated_at
  BEFORE UPDATE ON public.job_match_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
