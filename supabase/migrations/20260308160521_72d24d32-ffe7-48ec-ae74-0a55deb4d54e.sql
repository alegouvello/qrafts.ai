
-- Fix 1: Create a secure view for company_experiences that hides user_id for anonymous entries
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

-- Fix 2: Restrict feedback SELECT policy - remove the OR user_id IS NULL branch
-- This prevents unauthenticated users from reading anonymous feedback
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback;
CREATE POLICY "Users can view their own feedback"
  ON public.feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
