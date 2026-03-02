-- Allow anon users to update volumosos (needed for Bancada page which is public)
CREATE POLICY "Public can update volumosos"
ON public.volumosos
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);