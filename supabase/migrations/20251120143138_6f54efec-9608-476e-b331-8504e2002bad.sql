-- Create master_answers table for pre-written answers
CREATE TABLE public.master_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_pattern TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.master_answers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own master answers"
  ON public.master_answers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own master answers"
  ON public.master_answers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own master answers"
  ON public.master_answers
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own master answers"
  ON public.master_answers
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_master_answers_updated_at
  BEFORE UPDATE ON public.master_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();