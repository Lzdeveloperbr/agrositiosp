-- FUNCIONÁRIOS
CREATE TABLE public.funcionarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  funcao text,
  setor text,
  telefone text,
  cpf text,
  admissao date,
  demissao date,
  salario numeric,
  tipo_pagamento text NOT NULL DEFAULT 'mensal',
  valor_hora numeric,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funcionarios TO anon, authenticated;
GRANT ALL ON public.funcionarios TO service_role;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.funcionarios FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.funcionarios FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.funcionarios FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.funcionarios FOR DELETE USING (fazenda_id = current_fazenda_id());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.funcionarios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PONTO
CREATE TABLE public.pontos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  data date NOT NULL,
  entrada text,
  saida text,
  intervalo_min integer NOT NULL DEFAULT 0,
  horas numeric NOT NULL DEFAULT 0,
  extras numeric NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'normal',
  atividade text,
  observacoes text,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pontos TO anon, authenticated;
GRANT ALL ON public.pontos TO service_role;
ALTER TABLE public.pontos ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.pontos FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.pontos FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.pontos FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.pontos FOR DELETE USING (fazenda_id = current_fazenda_id());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.pontos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ORÇAMENTO / METAS
CREATE TABLE public.orcamento_metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  ano integer NOT NULL,
  mes integer NOT NULL,
  atividade text NOT NULL DEFAULT 'geral',
  categoria text NOT NULL,
  tipo text NOT NULL DEFAULT 'despesa',
  previsto numeric NOT NULL DEFAULT 0,
  observacoes text,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamento_metas TO anon, authenticated;
GRANT ALL ON public.orcamento_metas TO service_role;
ALTER TABLE public.orcamento_metas ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.orcamento_metas FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.orcamento_metas FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.orcamento_metas FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.orcamento_metas FOR DELETE USING (fazenda_id = current_fazenda_id());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.orcamento_metas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RASTREABILIDADE / SANIDADE
CREATE TABLE public.sanidade_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  data date NOT NULL,
  tipo text NOT NULL DEFAULT 'vacina',
  especie text NOT NULL DEFAULT 'bovino',
  alvo text NOT NULL,
  brincos text,
  quantidade integer,
  produto text,
  lote_produto text,
  fabricante text,
  dose text,
  via text,
  carencia_dias integer NOT NULL DEFAULT 0,
  carencia_ate date,
  responsavel text,
  crmv text,
  custo numeric,
  documento text,
  observacoes text,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanidade_registros TO anon, authenticated;
GRANT ALL ON public.sanidade_registros TO service_role;
ALTER TABLE public.sanidade_registros ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.sanidade_registros FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.sanidade_registros FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.sanidade_registros FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.sanidade_registros FOR DELETE USING (fazenda_id = current_fazenda_id());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.sanidade_registros FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();