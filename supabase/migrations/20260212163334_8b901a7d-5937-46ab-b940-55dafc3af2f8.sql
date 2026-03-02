-- Drop the old check constraint that doesn't include 'em_atendimento' and 'finalizado'
ALTER TABLE public.queue_drivers DROP CONSTRAINT queue_drivers_status_check;

-- Add updated constraint with all valid statuses
ALTER TABLE public.queue_drivers ADD CONSTRAINT queue_drivers_status_check 
  CHECK (status = ANY (ARRAY['waiting'::text, 'called'::text, 'completed'::text, 'em_atendimento'::text, 'finalizado'::text]));