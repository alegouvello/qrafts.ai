ALTER TABLE public.resumes ADD COLUMN is_primary boolean NOT NULL DEFAULT false;

-- Ensure only one primary resume per user via a partial unique index
CREATE UNIQUE INDEX idx_resumes_one_primary_per_user ON public.resumes (user_id) WHERE is_primary = true;