
-- Tabela de volumosos vinculados a rotas
CREATE TABLE public.volumosos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_letter text NOT NULL,
  route_number integer NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  observation text,
  status text NOT NULL DEFAULT 'disponivel',
  bench_number integer,
  retired_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraint de status válidos
ALTER TABLE public.volumosos ADD CONSTRAINT volumosos_status_check
  CHECK (status IN ('disponivel', 'em_separacao', 'retirado'));

-- Enable RLS
ALTER TABLE public.volumosos ENABLE ROW LEVEL SECURITY;

-- Apenas autenticados podem inserir/atualizar/deletar
CREATE POLICY "Authenticated users can read volumosos"
  ON public.volumosos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert volumosos"
  ON public.volumosos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update volumosos"
  ON public.volumosos FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete volumosos"
  ON public.volumosos FOR DELETE
  TO authenticated
  USING (true);

-- Leitura pública para a Bancada poder consultar (anon)
CREATE POLICY "Public can read volumosos"
  ON public.volumosos FOR SELECT
  TO anon
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.volumosos;

-- Index para busca por rota
CREATE INDEX idx_volumosos_route ON public.volumosos (route_letter, route_number);
