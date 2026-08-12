-- ============ GADO DE LEITE ============
CREATE TABLE public.leite_animais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  brinco text NOT NULL,
  nome text,
  sexo text NOT NULL DEFAULT 'femea',
  raca text,
  nascimento date,
  categoria text NOT NULL DEFAULT 'vaca_lactacao',
  pai text,
  mae text,
  origem text,
  data_entrada date NOT NULL DEFAULT current_date,
  valor_aquisicao numeric,
  peso_kg numeric,
  status text NOT NULL DEFAULT 'ativo',
  local text,
  observacoes text,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leite_animais TO anon, authenticated;
GRANT ALL ON public.leite_animais TO service_role;
ALTER TABLE public.leite_animais ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.leite_animais FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.leite_animais FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.leite_animais FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.leite_animais FOR DELETE USING (fazenda_id = current_fazenda_id());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.leite_animais FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_leite_animais_fazenda ON public.leite_animais(fazenda_id);

CREATE TABLE public.leite_producao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  animal_id uuid REFERENCES public.leite_animais(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT current_date,
  manha numeric NOT NULL DEFAULT 0,
  tarde numeric NOT NULL DEFAULT 0,
  noite numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  ordenhas integer NOT NULL DEFAULT 2,
  observacoes text,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leite_producao TO anon, authenticated;
GRANT ALL ON public.leite_producao TO service_role;
ALTER TABLE public.leite_producao ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.leite_producao FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.leite_producao FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.leite_producao FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.leite_producao FOR DELETE USING (fazenda_id = current_fazenda_id());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.leite_producao FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_leite_producao_fazenda_data ON public.leite_producao(fazenda_id, data);

CREATE TABLE public.leite_lactacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  animal_id uuid NOT NULL REFERENCES public.leite_animais(id) ON DELETE CASCADE,
  numero integer NOT NULL DEFAULT 1,
  data_parto date NOT NULL,
  data_secagem_prevista date,
  data_secagem date,
  pico_litros numeric,
  status text NOT NULL DEFAULT 'ativa',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leite_lactacoes TO anon, authenticated;
GRANT ALL ON public.leite_lactacoes TO service_role;
ALTER TABLE public.leite_lactacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.leite_lactacoes FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.leite_lactacoes FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.leite_lactacoes FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.leite_lactacoes FOR DELETE USING (fazenda_id = current_fazenda_id());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.leite_lactacoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.leite_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  animal_id uuid REFERENCES public.leite_animais(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  data date NOT NULL DEFAULT current_date,
  touro_semen text,
  resultado text,
  data_prevista date,
  problema text,
  medicamento text,
  dosagem text,
  data_fim date,
  responsavel text,
  custo numeric,
  observacoes text,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leite_eventos TO anon, authenticated;
GRANT ALL ON public.leite_eventos TO service_role;
ALTER TABLE public.leite_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.leite_eventos FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.leite_eventos FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.leite_eventos FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.leite_eventos FOR DELETE USING (fazenda_id = current_fazenda_id());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.leite_eventos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_leite_eventos_fazenda ON public.leite_eventos(fazenda_id, data);

-- ============ GADO DE ENGORDA ============
CREATE TABLE public.engorda_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  numero text NOT NULL,
  data_entrada date NOT NULL DEFAULT current_date,
  quantidade integer NOT NULL DEFAULT 0,
  raca text,
  categoria text,
  peso_inicial_total_kg numeric,
  peso_medio_inicial_kg numeric,
  origem text,
  valor_compra numeric,
  sistema text,
  local text,
  previsao_saida date,
  meta_gmd numeric,
  preco_arroba_venda numeric,
  encerrado boolean NOT NULL DEFAULT false,
  observacoes text,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engorda_lotes TO anon, authenticated;
GRANT ALL ON public.engorda_lotes TO service_role;
ALTER TABLE public.engorda_lotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.engorda_lotes FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.engorda_lotes FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.engorda_lotes FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.engorda_lotes FOR DELETE USING (fazenda_id = current_fazenda_id());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.engorda_lotes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.engorda_animais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  lote_id uuid REFERENCES public.engorda_lotes(id) ON DELETE SET NULL,
  brinco text NOT NULL,
  sexo text NOT NULL DEFAULT 'macho',
  raca text,
  categoria text,
  nascimento date,
  data_entrada date NOT NULL DEFAULT current_date,
  peso_entrada_kg numeric,
  valor_compra numeric,
  status text NOT NULL DEFAULT 'ativo',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engorda_animais TO anon, authenticated;
GRANT ALL ON public.engorda_animais TO service_role;
ALTER TABLE public.engorda_animais ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.engorda_animais FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.engorda_animais FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.engorda_animais FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.engorda_animais FOR DELETE USING (fazenda_id = current_fazenda_id());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.engorda_animais FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.engorda_pesagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  lote_id uuid REFERENCES public.engorda_lotes(id) ON DELETE CASCADE,
  animal_id uuid REFERENCES public.engorda_animais(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT current_date,
  quantidade integer,
  peso_total_kg numeric,
  peso_medio_kg numeric,
  observacoes text,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engorda_pesagens TO anon, authenticated;
GRANT ALL ON public.engorda_pesagens TO service_role;
ALTER TABLE public.engorda_pesagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.engorda_pesagens FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.engorda_pesagens FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.engorda_pesagens FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.engorda_pesagens FOR DELETE USING (fazenda_id = current_fazenda_id());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.engorda_pesagens FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_engorda_pesagens_lote ON public.engorda_pesagens(fazenda_id, lote_id, data);

-- ============ PLANILHAS INTELIGENTES ============
CREATE TABLE public.planilhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  modelo text NOT NULL DEFAULT 'branco',
  atividade text,
  vinculo jsonb NOT NULL DEFAULT '{}'::jsonb,
  colunas jsonb NOT NULL DEFAULT '[]'::jsonb,
  celulas jsonb NOT NULL DEFAULT '{}'::jsonb,
  linhas integer NOT NULL DEFAULT 30,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planilhas TO anon, authenticated;
GRANT ALL ON public.planilhas TO service_role;
ALTER TABLE public.planilhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.planilhas FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.planilhas FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.planilhas FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.planilhas FOR DELETE USING (fazenda_id = current_fazenda_id());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.planilhas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();