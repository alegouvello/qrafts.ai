
-- Fix: Users should not see internal_notes. Replace user-facing SELECT with a restricted one.
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback;

-- Users can see their own feedback but NOT internal_notes - use a view approach
-- Since we can't restrict columns via RLS, create a security definer function
CREATE OR REPLACE FUNCTION public.get_my_feedback()
RETURNS TABLE(
  id uuid,
  category text,
  message text,
  name text,
  email text,
  status text,
  created_at timestamptz,
  user_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT f.id, f.category, f.message, f.name, f.email, f.status, f.created_at, f.user_id
  FROM public.feedback f
  WHERE f.user_id = auth.uid();
$$;
