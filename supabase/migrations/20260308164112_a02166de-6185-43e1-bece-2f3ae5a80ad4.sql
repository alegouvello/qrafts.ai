
-- Replace the view with a SECURITY DEFINER function that safely masks user_id
DROP VIEW IF EXISTS public.company_experiences_public;

CREATE OR REPLACE FUNCTION public.get_company_experiences(p_company_name text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  company_name text,
  title text,
  experience_text text,
  experience_type text,
  rating integer,
  is_anonymous boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    ce.id,
    CASE
      WHEN ce.is_anonymous = true AND ce.user_id != auth.uid() THEN NULL
      ELSE ce.user_id
    END AS user_id,
    ce.company_name,
    ce.title,
    ce.experience_text,
    ce.experience_type,
    ce.rating,
    ce.is_anonymous,
    ce.created_at,
    ce.updated_at
  FROM public.company_experiences ce
  WHERE ce.company_name = p_company_name;
$$;
