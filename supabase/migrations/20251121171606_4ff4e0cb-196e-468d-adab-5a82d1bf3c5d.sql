-- Add website_url column to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS website_url TEXT;