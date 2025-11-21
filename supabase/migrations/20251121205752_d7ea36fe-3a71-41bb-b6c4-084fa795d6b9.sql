-- Add language preference to user profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';

-- Add check constraint for valid languages
ALTER TABLE public.user_profiles 
ADD CONSTRAINT valid_language CHECK (language IN ('en', 'fr', 'es'));