
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Authenticated read history" ON public.service_history;
DROP POLICY IF EXISTS "Authenticated insert history" ON public.service_history;
DROP POLICY IF EXISTS "Authenticated update history" ON public.service_history;

-- Create permissive policies
CREATE POLICY "Allow authenticated read history"
  ON public.service_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert history"
  ON public.service_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update history"
  ON public.service_history FOR UPDATE
  TO authenticated
  USING (true);

-- Also add public read so dashboard/anon can read
CREATE POLICY "Allow public read history"
  ON public.service_history FOR SELECT
  TO anon
  USING (true);

-- Allow public update for release operations from Bancada (no auth required)
CREATE POLICY "Allow public update history"
  ON public.service_history FOR UPDATE
  TO anon
  USING (true);
