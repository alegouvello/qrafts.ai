-- Create feedback table
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT,
  email TEXT,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit feedback (anonymous or authenticated)
CREATE POLICY "Anyone can submit feedback"
ON public.feedback
FOR INSERT
WITH CHECK (true);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.feedback
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- Add index for better query performance
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX idx_feedback_user_id ON public.feedback(user_id) WHERE user_id IS NOT NULL;