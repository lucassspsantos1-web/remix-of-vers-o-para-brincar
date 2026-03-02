
-- Update RLS policies on volumosos to allow public insert and delete
DROP POLICY IF EXISTS "Authenticated users can insert volumosos" ON public.volumosos;
CREATE POLICY "Public can insert volumosos"
  ON public.volumosos FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete volumosos" ON public.volumosos;
CREATE POLICY "Public can delete volumosos"
  ON public.volumosos FOR DELETE
  USING (true);
