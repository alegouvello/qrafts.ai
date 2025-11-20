-- Add tags column to master_answers table
ALTER TABLE public.master_answers 
ADD COLUMN tags text[] DEFAULT '{}';

-- Add an index for better performance when filtering by tags
CREATE INDEX idx_master_answers_tags ON public.master_answers USING GIN(tags);