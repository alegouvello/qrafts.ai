-- Add reminder_sent column to track which events have been notified
ALTER TABLE public.timeline_events 
ADD COLUMN reminder_sent BOOLEAN NOT NULL DEFAULT false;