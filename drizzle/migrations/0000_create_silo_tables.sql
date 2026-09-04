CREATE TABLE public.silo_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  lote_id text,
  capacidade_kg numeric NOT NULL DEFAULT 20000,
  capacidade_operacional_kg numeric,
  estoque_minimo_kg numeric NOT NULL DEFAULT 3000,
  margem_seguranca_kg numeric NOT NULL DEFAULT 1000,
  carga_padrao_kg numeric NOT NULL DEFAULT 8000,
  lead_time_horas numeric NOT NULL DEFAULT 24,
  erro_balanca_kg numeric NOT NULL DEFAULT 100,
  perda_pct numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.silo_config TO anon, authenticated;
GRANT ALL ON public.silo_config TO service_role;
ALTER TABLE public.silo_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.silo_config FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.silo_config FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.silo_config FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.silo_config FOR DELETE USING (fazenda_id = current_fazenda_id());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.silo_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.silo_pesagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  lote_id text,
  medido_em timestamptz NOT NULL DEFAULT now(),
  estoque_kg numeric NOT NULL,
  metodo text NOT NULL DEFAULT 'balanca',
  estimado_kg numeric,
  erro_kg numeric,
  observacoes text,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.silo_pesagens TO anon, authenticated;
GRANT ALL ON public.silo_pesagens TO service_role;
ALTER TABLE public.silo_pesagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.silo_pesagens FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.silo_pesagens FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.silo_pesagens FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.silo_pesagens FOR DELETE USING (fazenda_id = current_fazenda_id());

CREATE INDEX idx_silo_pesagens_fazenda_data ON public.silo_pesagens(fazenda_id, medido_em DESC);