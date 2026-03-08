
-- Remove the overly broad SELECT policy on the base table.
-- Community reads go through the security_invoker view which already masks user_id.
DROP POLICY IF EXISTS "Authenticated users can view all experiences via view" ON public.company_experiences;
