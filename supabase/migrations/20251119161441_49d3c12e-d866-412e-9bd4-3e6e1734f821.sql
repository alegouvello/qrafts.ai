-- Create timeline events table
CREATE TABLE public.timeline_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('note', 'interview', 'follow_up', 'deadline', 'offer', 'rejection', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for timeline events
CREATE POLICY "Users can view events for their applications"
  ON public.timeline_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = timeline_events.application_id
    AND applications.user_id = auth.uid()
  ));

CREATE POLICY "Users can create events for their applications"
  ON public.timeline_events FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.id = timeline_events.application_id
      AND applications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update events for their applications"
  ON public.timeline_events FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = timeline_events.application_id
    AND applications.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete events for their applications"
  ON public.timeline_events FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = timeline_events.application_id
    AND applications.user_id = auth.uid()
  ));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_timeline_events_updated_at
  BEFORE UPDATE ON public.timeline_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_timeline_events_application_id ON public.timeline_events(application_id);
CREATE INDEX idx_timeline_events_event_date ON public.timeline_events(event_date);