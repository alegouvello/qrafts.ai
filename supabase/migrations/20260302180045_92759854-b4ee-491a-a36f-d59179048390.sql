-- Drop the old unique constraint that includes url (NULL urls cause issues with upserts)
ALTER TABLE public.job_openings DROP CONSTRAINT IF EXISTS job_openings_company_name_title_url_key;

-- Add a simpler unique constraint on company_name + title
CREATE UNIQUE INDEX IF NOT EXISTS job_openings_company_title_key ON public.job_openings (company_name, title);
