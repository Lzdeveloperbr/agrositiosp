-- MÁQUINAS
CREATE TABLE public.maquinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'trator',
  marca text,
  modelo text,
  ano integer,
  placa text,
  horimetro numeric DEFAULT 0,
  observacoes text,
  abastecimentos jsonb NOT NULL DEFAULT '[]'::jsonb,
  manutencoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.maquinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.maquinas FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.maquinas FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.maquinas FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.maquinas FOR DELETE USING (fazenda_id = current_fazenda_id());
ALTER PUBLICATION supabase_realtime ADD TABLE public.maquinas;

-- PLUVIOMETRIA
CREATE TABLE public.chuvas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  data date NOT NULL,
  mm numeric NOT NULL DEFAULT 0,
  local text,
  observacoes text,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chuvas ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.chuvas FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.chuvas FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.chuvas FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.chuvas FOR DELETE USING (fazenda_id = current_fazenda_id());
ALTER PUBLICATION supabase_realtime ADD TABLE public.chuvas;

-- MIP / MONITORAMENTO
CREATE TABLE public.monitoramentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  data date NOT NULL,
  modulo text NOT NULL DEFAULT 'gado',
  alvo text NOT NULL,
  severidade text NOT NULL DEFAULT 'media',
  acao text,
  produto text,
  dose text,
  local text,
  gps jsonb,
  fotos jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacoes text,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.monitoramentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.monitoramentos FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.monitoramentos FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.monitoramentos FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.monitoramentos FOR DELETE USING (fazenda_id = current_fazenda_id());
ALTER PUBLICATION supabase_realtime ADD TABLE public.monitoramentos;

-- COMPRAS
CREATE TABLE public.compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  data date NOT NULL,
  fornecedor text,
  status text NOT NULL DEFAULT 'solicitado',
  solicitante text,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL DEFAULT 0,
  data_pedido date,
  data_recebimento date,
  observacoes text,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.compras FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.compras FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.compras FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.compras FOR DELETE USING (fazenda_id = current_fazenda_id());
ALTER PUBLICATION supabase_realtime ADD TABLE public.compras;

-- FINANCEIRO: contas a pagar/receber
ALTER TABLE public.financeiro
  ADD COLUMN IF NOT EXISTS vencimento date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pago',
  ADD COLUMN IF NOT EXISTS data_pagamento date;

-- ANIMAIS: reprodução
ALTER TABLE public.animais
  ADD COLUMN IF NOT EXISTS reproducao jsonb NOT NULL DEFAULT '[]'::jsonb;