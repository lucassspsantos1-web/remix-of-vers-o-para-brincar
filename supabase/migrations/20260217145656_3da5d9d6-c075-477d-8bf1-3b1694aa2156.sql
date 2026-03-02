
-- 1. Restrict service_history SELECT to authenticated users only (driver privacy)
DROP POLICY IF EXISTS "Allow public read history" ON service_history;
CREATE POLICY "Authenticated read history"
  ON service_history FOR SELECT
  TO authenticated
  USING (true);

-- 2. Restrict service_history INSERT to authenticated users (Bancada inserts history)
DROP POLICY IF EXISTS "Allow public insert history" ON service_history;
CREATE POLICY "Authenticated insert history"
  ON service_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Restrict service_history UPDATE to authenticated users
DROP POLICY IF EXISTS "Allow public update history" ON service_history;
CREATE POLICY "Authenticated update history"
  ON service_history FOR UPDATE
  TO authenticated
  USING (true);

-- 4. Restrict volumosos public UPDATE to only valid status transitions
DROP POLICY IF EXISTS "Public can update volumosos" ON volumosos;
CREATE POLICY "Public can update volumosos status"
  ON volumosos FOR UPDATE
  TO anon
  USING (status IN ('disponivel', 'em_separacao'))
  WITH CHECK (status IN ('em_separacao', 'retirado'));

-- 5. Add input validation to claim_driver function
CREATE OR REPLACE FUNCTION public.claim_driver(p_bench_number integer, p_driver_id uuid DEFAULT NULL)
RETURNS SETOF queue_drivers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
BEGIN
  -- Input validation
  IF p_bench_number < 1 OR p_bench_number > 24 THEN
    RAISE EXCEPTION 'Invalid bench number: must be between 1 and 24';
  END IF;

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
