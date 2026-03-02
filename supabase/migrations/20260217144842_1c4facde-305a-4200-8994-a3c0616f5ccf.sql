
-- Add database constraints for data integrity
ALTER TABLE queue_drivers 
  ADD CONSTRAINT check_route_letter CHECK (route_letter ~ '^[A-Z]+$'),
  ADD CONSTRAINT check_route_number CHECK (route_number BETWEEN 1 AND 24),
  ADD CONSTRAINT check_full_name_length CHECK (char_length(full_name) BETWEEN 1 AND 200);

ALTER TABLE service_history
  ADD CONSTRAINT check_sh_route_letter CHECK (route_letter ~ '^[A-Z]+$'),
  ADD CONSTRAINT check_sh_route_number CHECK (route_number BETWEEN 1 AND 24),
  ADD CONSTRAINT check_sh_bench_number CHECK (bench_number BETWEEN 1 AND 24),
  ADD CONSTRAINT check_sh_driver_name_length CHECK (char_length(driver_name) BETWEEN 1 AND 200);

ALTER TABLE volumosos
  ADD CONSTRAINT check_vol_route_letter CHECK (route_letter ~ '^[A-Z]+$'),
  ADD CONSTRAINT check_vol_route_number CHECK (route_number BETWEEN 1 AND 24),
  ADD CONSTRAINT check_vol_quantity CHECK (quantity >= 1);

-- Restrict motoristas_base_dia INSERT/DELETE to authenticated users only
DROP POLICY IF EXISTS "Allow public insert motoristas_base_dia" ON motoristas_base_dia;
DROP POLICY IF EXISTS "Allow public delete motoristas_base_dia" ON motoristas_base_dia;

CREATE POLICY "Authenticated insert motoristas_base_dia"
  ON motoristas_base_dia FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated delete motoristas_base_dia"
  ON motoristas_base_dia FOR DELETE
  TO authenticated
  USING (true);
