
-- Table for daily driver base (replaced entirely on each import)
CREATE TABLE public.motoristas_base_dia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_motorista TEXT NOT NULL,
  nome TEXT NOT NULL,
  rota TEXT NOT NULL,
  tipo_veiculo TEXT,
  data_importacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast QR code lookup
CREATE INDEX idx_motoristas_base_dia_id_motorista ON public.motoristas_base_dia (id_motorista);

-- Enable RLS
ALTER TABLE public.motoristas_base_dia ENABLE ROW LEVEL SECURITY;

-- Public read (needed for check-in lookup)
CREATE POLICY "Allow public read motoristas_base_dia"
  ON public.motoristas_base_dia FOR SELECT
  USING (true);

-- Public insert (for CSV import)
CREATE POLICY "Allow public insert motoristas_base_dia"
  ON public.motoristas_base_dia FOR INSERT
  WITH CHECK (true);

-- Public delete (for clearing before import)
CREATE POLICY "Allow public delete motoristas_base_dia"
  ON public.motoristas_base_dia FOR DELETE
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.motoristas_base_dia;
