
-- ============================================================
-- FIX 2: Recreate company_experiences_public with security_invoker
-- ============================================================
DROP VIEW IF EXISTS public.company_experiences_public;

CREATE VIEW public.company_experiences_public
WITH (security_invoker = on) AS
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

-- Add a permissive SELECT policy so authenticated users can read via the view
-- (The view now respects RLS on the base table, but we need a broader SELECT
-- policy on the base table for the view to work for community data)
-- We already have "Users can view their own experiences" which is owner-only.
-- We need to add a community read policy for the view:
CREATE POLICY "Authenticated users can view all experiences via view"
  ON public.company_experiences FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- FIX 3: Tighten feedback INSERT - add trigger to sanitize admin fields
-- ============================================================
CREATE OR REPLACE FUNCTION public.sanitize_feedback_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Force admin-only fields to safe defaults on INSERT
  NEW.status := 'pending';
  NEW.internal_notes := NULL;
  NEW.resolved_at := NULL;
  NEW.resolved_by := NULL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sanitize_feedback_insert
  BEFORE INSERT ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_feedback_insert();
