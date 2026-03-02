
-- Add cancellation tracking columns to queue_drivers
ALTER TABLE public.queue_drivers
  ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cancelled_by text;
