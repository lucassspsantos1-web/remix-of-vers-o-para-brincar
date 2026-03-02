
-- Drop existing table and recreate with session_id and last_seen
DROP TABLE IF EXISTS public.active_benches;

CREATE TABLE public.active_benches (
  bench_number integer PRIMARY KEY,
  session_id text NOT NULL,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.active_benches ENABLE ROW LEVEL SECURITY;

-- RLS policies (public access for bench management)
CREATE POLICY "Allow public read active_benches"
ON public.active_benches FOR SELECT
USING (true);

CREATE POLICY "Allow public insert active_benches"
ON public.active_benches FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update active_benches"
ON public.active_benches FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete active_benches"
ON public.active_benches FOR DELETE
USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_benches;

-- Function to cleanup stale benches (last_seen > 60 seconds ago)
CREATE OR REPLACE FUNCTION public.cleanup_stale_benches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM active_benches
  WHERE last_seen < now() - interval '60 seconds';
END;
$$;
