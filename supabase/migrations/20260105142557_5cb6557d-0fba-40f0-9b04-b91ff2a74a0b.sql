-- Add company_domain column to store resolved logo domain for consistency
ALTER TABLE public.applications 
ADD COLUMN company_domain text;