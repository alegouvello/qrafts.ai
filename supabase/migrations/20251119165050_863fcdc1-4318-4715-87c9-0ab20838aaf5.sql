-- Add role_summary column to applications table to store structured job information
ALTER TABLE public.applications 
ADD COLUMN role_summary JSONB DEFAULT NULL;

-- Add comment to document the structure
COMMENT ON COLUMN public.applications.role_summary IS 'Stores structured job information including location, salary_range, description, responsibilities, requirements, and benefits';