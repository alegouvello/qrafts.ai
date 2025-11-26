-- Create table for storing tailored resume versions
CREATE TABLE public.tailored_resumes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  version_name TEXT NOT NULL,
  resume_text TEXT NOT NULL,
  position TEXT,
  company TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tailored_resumes ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own tailored resumes" 
ON public.tailored_resumes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tailored resumes" 
ON public.tailored_resumes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tailored resumes" 
ON public.tailored_resumes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tailored resumes" 
ON public.tailored_resumes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tailored_resumes_updated_at
BEFORE UPDATE ON public.tailored_resumes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_tailored_resumes_user_id ON public.tailored_resumes(user_id);
CREATE INDEX idx_tailored_resumes_application_id ON public.tailored_resumes(application_id);