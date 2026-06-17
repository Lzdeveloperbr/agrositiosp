CREATE TABLE public.cotacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  produto TEXT NOT NULL,
  praca TEXT,
  unidade TEXT NOT NULL DEFAULT 'sc',
  valor NUMERIC(12,2) NOT NULL,
  variacao_pct NUMERIC(6,2),
  fonte TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotacoes TO anon;
GRANT ALL ON public.cotacoes TO service_role;

ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cotacoes_select_by_fazenda" ON public.cotacoes FOR SELECT TO anon
  USING (fazenda_id = public.current_fazenda_id());
CREATE POLICY "cotacoes_insert_by_fazenda" ON public.cotacoes FOR INSERT TO anon
  WITH CHECK (fazenda_id = public.current_fazenda_id());
CREATE POLICY "cotacoes_update_by_fazenda" ON public.cotacoes FOR UPDATE TO anon
  USING (fazenda_id = public.current_fazenda_id())
  WITH CHECK (fazenda_id = public.current_fazenda_id());
CREATE POLICY "cotacoes_delete_by_fazenda" ON public.cotacoes FOR DELETE TO anon
  USING (fazenda_id = public.current_fazenda_id());

CREATE INDEX idx_cotacoes_fazenda_data ON public.cotacoes(fazenda_id, data DESC);