-- Table to store shared application questions visible to all authenticated users
-- Questions are auto-populated when extract-job-questions runs
CREATE TABLE public.shared_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL,
  position text NOT NULL,
  question_text text NOT NULL,
  contributed_by uuid NOT NULL,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Prevent exact duplicates for same company+position+question
  UNIQUE (company, position, question_text)
);

-- Enable RLS
ALTER TABLE public.shared_questions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read shared questions
CREATE POLICY "Authenticated users can view shared questions"
ON public.shared_questions
FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own shared questions
CREATE POLICY "Users can contribute shared questions"
ON public.shared_questions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = contributed_by);

-- Users can delete their own contributions
CREATE POLICY "Users can delete their own shared questions"
ON public.shared_questions
FOR DELETE
TO authenticated
USING (auth.uid() = contributed_by);

-- Index for fast lookups by company+position
CREATE INDEX idx_shared_questions_company_position ON public.shared_questions (company, position);