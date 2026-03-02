
CREATE TABLE public.active_benches (
  bench_number integer PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.active_benches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read active_benches" ON public.active_benches FOR SELECT USING (true);
CREATE POLICY "Allow public insert active_benches" ON public.active_benches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete active_benches" ON public.active_benches FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.active_benches;
