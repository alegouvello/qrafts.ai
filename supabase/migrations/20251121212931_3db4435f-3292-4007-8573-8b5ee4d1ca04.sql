-- Add notes field to interviewers table for manual bio/research notes
ALTER TABLE public.interviewers 
ADD COLUMN notes TEXT;