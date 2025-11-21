-- Create a security definer function to get aggregated company statistics across all users
CREATE OR REPLACE FUNCTION public.get_company_stats(company_name TEXT)
RETURNS TABLE (
  total_applications BIGINT,
  avg_response_days NUMERIC,
  fastest_response_days INTEGER,
  interview_rate NUMERIC,
  acceptance_rate NUMERIC,
  rejection_rate NUMERIC,
  interview_count BIGINT,
  accepted_count BIGINT,
  rejected_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH company_apps AS (
    SELECT 
      a.id,
      a.status,
      a.applied_date,
      a.user_id
    FROM applications a
    WHERE a.company = company_name
  ),
  app_history AS (
    SELECT 
      ash.application_id,
      ash.status,
      ash.changed_at,
      ca.applied_date,
      ROW_NUMBER() OVER (PARTITION BY ash.application_id ORDER BY ash.changed_at ASC) as rn
    FROM application_status_history ash
    JOIN company_apps ca ON ca.id = ash.application_id
  ),
  first_responses AS (
    SELECT 
      application_id,
      EXTRACT(DAY FROM (changed_at - applied_date))::INTEGER as response_days
    FROM app_history
    WHERE rn = 1
  )
  SELECT
    COUNT(DISTINCT ca.id)::BIGINT as total_applications,
    ROUND(AVG(fr.response_days), 1) as avg_response_days,
    MIN(fr.response_days)::INTEGER as fastest_response_days,
    ROUND((COUNT(DISTINCT CASE WHEN ca.status = 'interview' THEN ca.id END)::NUMERIC / NULLIF(COUNT(DISTINCT ca.id), 0)) * 100, 0) as interview_rate,
    ROUND((COUNT(DISTINCT CASE WHEN ca.status = 'accepted' THEN ca.id END)::NUMERIC / NULLIF(COUNT(DISTINCT ca.id), 0)) * 100, 0) as acceptance_rate,
    ROUND((COUNT(DISTINCT CASE WHEN ca.status = 'rejected' THEN ca.id END)::NUMERIC / NULLIF(COUNT(DISTINCT ca.id), 0)) * 100, 0) as rejection_rate,
    COUNT(DISTINCT CASE WHEN ca.status = 'interview' THEN ca.id END)::BIGINT as interview_count,
    COUNT(DISTINCT CASE WHEN ca.status = 'accepted' THEN ca.id END)::BIGINT as accepted_count,
    COUNT(DISTINCT CASE WHEN ca.status = 'rejected' THEN ca.id END)::BIGINT as rejected_count
  FROM company_apps ca
  LEFT JOIN first_responses fr ON fr.application_id = ca.id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_company_stats(TEXT) TO authenticated;