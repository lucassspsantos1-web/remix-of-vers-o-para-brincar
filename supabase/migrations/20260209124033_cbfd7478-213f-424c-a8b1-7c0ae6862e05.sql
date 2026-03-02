
-- Table for drivers in the queue
CREATE TABLE public.queue_drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  route_letter TEXT NOT NULL,
  route_number INTEGER NOT NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'completed'))
);

-- Table for service history
CREATE TABLE public.service_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_name TEXT NOT NULL,
  route_letter TEXT NOT NULL,
  route_number INTEGER NOT NULL,
  bench_number INTEGER NOT NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL,
  called_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public access (no auth)
ALTER TABLE public.queue_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read queue" ON public.queue_drivers FOR SELECT USING (true);
CREATE POLICY "Allow public insert queue" ON public.queue_drivers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update queue" ON public.queue_drivers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete queue" ON public.queue_drivers FOR DELETE USING (true);

CREATE POLICY "Allow public read history" ON public.service_history FOR SELECT USING (true);
CREATE POLICY "Allow public insert history" ON public.service_history FOR INSERT WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_history;
