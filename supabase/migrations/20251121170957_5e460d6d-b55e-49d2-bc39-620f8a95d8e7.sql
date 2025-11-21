-- Add column to store AI fit analysis results
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS fit_analysis JSONB,
ADD COLUMN IF NOT EXISTS fit_analyzed_at TIMESTAMP WITH TIME ZONE;

-- Add comment explaining the structure
COMMENT ON COLUMN public.applications.fit_analysis IS 'Stores AI analysis results including fitScore, overallFit, strengths, gaps, and suggestions';
COMMENT ON COLUMN public.applications.fit_analyzed_at IS 'Timestamp of when the fit analysis was last performed';