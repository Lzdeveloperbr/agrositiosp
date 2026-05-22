
CREATE TABLE public.granjas_racao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL,
  nome text NOT NULL,
  proprietario text,
  cidade text,
  endereco text,
  qtd_aves integer,
  qtd_galpoes integer,
  observacoes text,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.granjas_racao ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.granjas_racao FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.granjas_racao FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.granjas_racao FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.granjas_racao FOR DELETE USING (fazenda_id = current_fazenda_id());

CREATE TABLE public.entregas_racao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL,
  granja_id uuid,
  data date NOT NULL,
  viagem text,
  placa text,
  motorista text,
  tipo_racao text,
  galpao text,
  quantidade_kg numeric NOT NULL DEFAULT 0,
  documento_url text,
  observacoes text,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.entregas_racao ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.entregas_racao FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.entregas_racao FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.entregas_racao FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.entregas_racao FOR DELETE USING (fazenda_id = current_fazenda_id());
CREATE INDEX idx_entregas_racao_data ON public.entregas_racao(fazenda_id, data DESC);

CREATE TABLE public.documentos_racao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL,
  entrega_id uuid,
  granja_id uuid,
  nome text NOT NULL,
  url text NOT NULL,
  mime text,
  motorista text,
  viagem text,
  data date,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.documentos_racao ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.documentos_racao FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.documentos_racao FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.documentos_racao FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.documentos_racao FOR DELETE USING (fazenda_id = current_fazenda_id());
