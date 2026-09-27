ALTER TABLE public.lotes ADD COLUMN IF NOT EXISTS linhagem TEXT, ADD COLUMN IF NOT EXISTS sexo TEXT, ADD COLUMN IF NOT EXISTS galpao TEXT;
CREATE TABLE public.lote_medicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  registrado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  consumo_racao_kg NUMERIC,
  consumo_agua_l NUMERIC,
  temperatura_c NUMERIC,
  umidade_pct NUMERIC,
  ventilacao TEXT,
  cama TEXT,
  iluminacao_lux NUMERIC,
  horas_luz NUMERIC,
  uniformidade_pct NUMERIC,
  observacoes TEXT,
  autor TEXT,
  UNIQUE (lote_id, data)
);
GRANT SELECT, INSERT, UPDATE ON public.lote_medicoes TO anon;
GRANT ALL ON public.lote_medicoes TO service_role;
ALTER TABLE public.lote_medicoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY lote_medicoes_select ON public.lote_medicoes FOR SELECT TO anon USING (fazenda_id = public.current_fazenda_id());
CREATE POLICY lote_medicoes_insert ON public.lote_medicoes FOR INSERT TO anon WITH CHECK (fazenda_id = public.current_fazenda_id() AND EXISTS (SELECT 1 FROM public.lotes l WHERE l.id = lote_id AND l.fazenda_id = fazenda_id));
CREATE POLICY lote_medicoes_update ON public.lote_medicoes FOR UPDATE TO anon USING (fazenda_id = public.current_fazenda_id()) WITH CHECK (fazenda_id = public.current_fazenda_id() AND EXISTS (SELECT 1 FROM public.lotes l WHERE l.id = lote_id AND l.fazenda_id = fazenda_id));
CREATE INDEX lote_medicoes_fazenda_lote_data_idx ON public.lote_medicoes (fazenda_id, lote_id, data DESC);