-- Create application_status_history table to track status changes
CREATE TABLE public.application_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL,
  status TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_application FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view status history for their applications"
ON public.application_status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = application_status_history.application_id
    AND applications.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create status history for their applications"
ON public.application_status_history
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = application_status_history.application_id
    AND applications.user_id = auth.uid()
  )
);

-- Create index for better query performance
CREATE INDEX idx_status_history_application ON public.application_status_history(application_id);
CREATE INDEX idx_status_history_changed_at ON public.application_status_history(changed_at);