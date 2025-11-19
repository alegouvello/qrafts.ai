-- Create applications table
CREATE TABLE public.applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for applications
CREATE POLICY "Users can view their own applications"
  ON public.applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own applications"
  ON public.applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications"
  ON public.applications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own applications"
  ON public.applications FOR DELETE
  USING (auth.uid() = user_id);

-- Create questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- RLS policies for questions
CREATE POLICY "Users can view questions for their applications"
  ON public.questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = questions.application_id
    AND applications.user_id = auth.uid()
  ));

CREATE POLICY "Users can create questions for their applications"
  ON public.questions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = questions.application_id
    AND applications.user_id = auth.uid()
  ));

CREATE POLICY "Users can update questions for their applications"
  ON public.questions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = questions.application_id
    AND applications.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete questions for their applications"
  ON public.questions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = questions.application_id
    AND applications.user_id = auth.uid()
  ));

-- Create answers table
CREATE TABLE public.answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  answer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- RLS policies for answers
CREATE POLICY "Users can view their own answers"
  ON public.answers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own answers"
  ON public.answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own answers"
  ON public.answers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own answers"
  ON public.answers FOR DELETE
  USING (auth.uid() = user_id);

-- Create resumes table
CREATE TABLE public.resumes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

-- RLS policies for resumes
CREATE POLICY "Users can view their own resumes"
  ON public.resumes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own resumes"
  ON public.resumes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resumes"
  ON public.resumes FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false);

-- Storage policies for resumes
CREATE POLICY "Users can view their own resume files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own resume files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own resume files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_answers_updated_at
  BEFORE UPDATE ON public.answers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();