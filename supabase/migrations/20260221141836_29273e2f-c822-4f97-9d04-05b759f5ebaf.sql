
-- =============================================
-- FIX: All policies are RESTRICTIVE (Permissive: No)
-- PostgreSQL requires at least one PERMISSIVE policy to grant access.
-- Restrictive policies only narrow access already granted by permissive ones.
-- Without permissive policies, ALL access is denied.
-- =============================================

-- ========== active_benches ==========
DROP POLICY IF EXISTS "Allow public delete active_benches" ON public.active_benches;
DROP POLICY IF EXISTS "Allow public insert active_benches" ON public.active_benches;
DROP POLICY IF EXISTS "Allow public read active_benches" ON public.active_benches;
DROP POLICY IF EXISTS "Allow public update active_benches" ON public.active_benches;
-- Trim variants
DROP POLICY IF EXISTS "Allow public delete active_benches " ON public.active_benches;
DROP POLICY IF EXISTS "Allow public insert active_benches " ON public.active_benches;
DROP POLICY IF EXISTS "Allow public read active_benches " ON public.active_benches;
DROP POLICY IF EXISTS "Allow public update active_benches " ON public.active_benches;

CREATE POLICY "public_select_active_benches" ON public.active_benches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_insert_active_benches" ON public.active_benches FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_update_active_benches" ON public.active_benches FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "public_delete_active_benches" ON public.active_benches FOR DELETE TO anon, authenticated USING (true);

-- ========== motoristas_base_dia ==========
DROP POLICY IF EXISTS "Allow public read motoristas_base_dia" ON public.motoristas_base_dia;
DROP POLICY IF EXISTS "Allow public read motoristas_base_dia " ON public.motoristas_base_dia;
DROP POLICY IF EXISTS "Authenticated delete motoristas_base_dia" ON public.motoristas_base_dia;
DROP POLICY IF EXISTS "Authenticated delete motoristas_base_dia " ON public.motoristas_base_dia;
DROP POLICY IF EXISTS "Authenticated insert motoristas_base_dia" ON public.motoristas_base_dia;
DROP POLICY IF EXISTS "Authenticated insert motoristas_base_dia " ON public.motoristas_base_dia;

CREATE POLICY "public_select_motoristas" ON public.motoristas_base_dia FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "auth_insert_motoristas" ON public.motoristas_base_dia FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_delete_motoristas" ON public.motoristas_base_dia FOR DELETE TO authenticated USING (true);

-- ========== queue_drivers ==========
DROP POLICY IF EXISTS "Allow public delete queue" ON public.queue_drivers;
DROP POLICY IF EXISTS "Allow public delete queue " ON public.queue_drivers;
DROP POLICY IF EXISTS "Allow public insert queue" ON public.queue_drivers;
DROP POLICY IF EXISTS "Allow public insert queue " ON public.queue_drivers;
DROP POLICY IF EXISTS "Allow public read queue" ON public.queue_drivers;
DROP POLICY IF EXISTS "Allow public read queue " ON public.queue_drivers;
DROP POLICY IF EXISTS "Allow public update queue" ON public.queue_drivers;
DROP POLICY IF EXISTS "Allow public update queue " ON public.queue_drivers;

CREATE POLICY "public_select_queue" ON public.queue_drivers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_insert_queue" ON public.queue_drivers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_update_queue" ON public.queue_drivers FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "public_delete_queue" ON public.queue_drivers FOR DELETE TO anon, authenticated USING (true);

-- ========== service_history ==========
DROP POLICY IF EXISTS "Allow authenticated insert history" ON public.service_history;
DROP POLICY IF EXISTS "Allow authenticated insert history " ON public.service_history;
DROP POLICY IF EXISTS "Allow authenticated read history" ON public.service_history;
DROP POLICY IF EXISTS "Allow authenticated read history " ON public.service_history;
DROP POLICY IF EXISTS "Allow authenticated update history" ON public.service_history;
DROP POLICY IF EXISTS "Allow authenticated update history " ON public.service_history;
DROP POLICY IF EXISTS "Allow public read history" ON public.service_history;
DROP POLICY IF EXISTS "Allow public read history " ON public.service_history;
DROP POLICY IF EXISTS "Allow public update history" ON public.service_history;
DROP POLICY IF EXISTS "Allow public update history " ON public.service_history;

CREATE POLICY "public_select_history" ON public.service_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_insert_history" ON public.service_history FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_update_history" ON public.service_history FOR UPDATE TO anon, authenticated USING (true);

-- ========== volumosos ==========
DROP POLICY IF EXISTS "Authenticated users can read volumosos" ON public.volumosos;
DROP POLICY IF EXISTS "Authenticated users can read volumosos " ON public.volumosos;
DROP POLICY IF EXISTS "Authenticated users can update volumosos" ON public.volumosos;
DROP POLICY IF EXISTS "Authenticated users can update volumosos " ON public.volumosos;
DROP POLICY IF EXISTS "Public can delete volumosos" ON public.volumosos;
DROP POLICY IF EXISTS "Public can delete volumosos " ON public.volumosos;
DROP POLICY IF EXISTS "Public can insert volumosos" ON public.volumosos;
DROP POLICY IF EXISTS "Public can insert volumosos " ON public.volumosos;
DROP POLICY IF EXISTS "Public can read volumosos" ON public.volumosos;
DROP POLICY IF EXISTS "Public can read volumosos " ON public.volumosos;
DROP POLICY IF EXISTS "Public can update volumosos status" ON public.volumosos;
DROP POLICY IF EXISTS "Public can update volumosos status " ON public.volumosos;

CREATE POLICY "public_select_volumosos" ON public.volumosos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_insert_volumosos" ON public.volumosos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_update_volumosos" ON public.volumosos FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "public_delete_volumosos" ON public.volumosos FOR DELETE TO anon, authenticated USING (true);
