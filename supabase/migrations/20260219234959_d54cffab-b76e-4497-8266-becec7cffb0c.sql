
CREATE OR REPLACE FUNCTION public.claim_driver(p_bench_number integer, p_driver_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF queue_drivers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_driver_id uuid;
  v_driver queue_drivers%ROWTYPE;
BEGIN
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

  UPDATE queue_drivers
  SET status = 'em_atendimento',
      bench_number = p_bench_number,
      called_at = now()
  WHERE id = v_driver_id
  RETURNING * INTO v_driver;

  -- Insert into service_history atomically (bypasses RLS via SECURITY DEFINER)
  INSERT INTO service_history (driver_name, route_letter, route_number, bench_number, checked_in_at, called_at)
  VALUES (v_driver.full_name, v_driver.route_letter, v_driver.route_number, p_bench_number, v_driver.checked_in_at, v_driver.called_at);

  RETURN NEXT v_driver;
END;
$function$;
