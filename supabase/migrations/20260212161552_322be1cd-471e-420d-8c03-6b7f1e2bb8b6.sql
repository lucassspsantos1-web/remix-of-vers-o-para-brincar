
-- Add columns to track which bench claimed a driver
ALTER TABLE public.queue_drivers ADD COLUMN bench_number integer;
ALTER TABLE public.queue_drivers ADD COLUMN called_at timestamptz;

-- Atomic function: claim next (or specific) driver with FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_driver(p_bench_number integer, p_driver_id uuid DEFAULT NULL)
RETURNS SETOF public.queue_drivers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
BEGIN
  IF p_driver_id IS NOT NULL THEN
    SELECT id INTO v_driver_id
    FROM queue_drivers
    WHERE id = p_driver_id AND status = 'waiting' AND bench_number IS NULL
    FOR UPDATE SKIP LOCKED;
  ELSE
    SELECT id INTO v_driver_id
    FROM queue_drivers
    WHERE status = 'waiting' AND bench_number IS NULL
    ORDER BY checked_in_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
  END IF;

  IF v_driver_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE queue_drivers
  SET status = 'em_atendimento',
      bench_number = p_bench_number,
      called_at = now()
  WHERE id = v_driver_id
  RETURNING *;
END;
$$;
