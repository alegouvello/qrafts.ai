
-- Drop the security_invoker view and recreate without it (runs as definer, bypasses base table RLS)
DROP VIEW IF EXISTS public.company_experiences_public;

CREATE VIEW public.company_experiences_public AS
  SELECT
    id,
    CASE 
      WHEN is_anonymous = true AND user_id != auth.uid() THEN NULL
      ELSE user_id
    END AS user_id,
    company_name,
    title,
    experience_text,
    experience_type,
    rating,
    is_anonymous,
    created_at,
    updated_at
  FROM public.company_experiences;

-- Grant access to the view for authenticated users only
GRANT SELECT ON public.company_experiences_public TO authenticated;
REVOKE SELECT ON public.company_experiences_public FROM anon;

-- Now restrict the base table SELECT to own rows only (for delete button, etc.)
DROP POLICY IF EXISTS "Authenticated users can view all experiences" ON public.company_experiences;
CREATE POLICY "Users can view their own experiences"
  ON public.company_experiences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
