-- Create company_notes table to store user notes about companies
CREATE TABLE public.company_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_name)
);

-- Enable RLS
ALTER TABLE public.company_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own company notes"
ON public.company_notes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own company notes"
ON public.company_notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company notes"
ON public.company_notes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own company notes"
ON public.company_notes
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_company_notes_updated_at
BEFORE UPDATE ON public.company_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_company_notes_user_company ON public.company_notes(user_id, company_name);