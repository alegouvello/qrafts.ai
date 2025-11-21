-- Create interviewers table
CREATE TABLE public.interviewers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  role TEXT,
  company TEXT,
  linkedin_url TEXT,
  extracted_data JSONB,
  interview_prep JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interviewers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view interviewers for their applications"
  ON public.interviewers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.id = interviewers.application_id
      AND applications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create interviewers for their applications"
  ON public.interviewers
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.id = interviewers.application_id
      AND applications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update interviewers for their applications"
  ON public.interviewers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.id = interviewers.application_id
      AND applications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete interviewers for their applications"
  ON public.interviewers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.id = interviewers.application_id
      AND applications.user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_interviewers_updated_at
  BEFORE UPDATE ON public.interviewers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();