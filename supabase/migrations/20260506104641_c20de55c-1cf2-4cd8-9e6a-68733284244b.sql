
-- =========== Fazendas ===========
CREATE TABLE public.fazendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo_acesso TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Função: o código da fazenda é enviado em cada request via header "x-fazenda-codigo"
CREATE OR REPLACE FUNCTION public.current_fazenda_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.fazendas
  WHERE codigo_acesso = current_setting('request.headers', true)::json->>'x-fazenda-codigo'
  LIMIT 1
$$;

-- Função pública para validar/obter fazenda por código (chamada do client antes de acessar)
CREATE OR REPLACE FUNCTION public.entrar_fazenda(p_codigo TEXT)
RETURNS TABLE(id UUID, nome TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nome FROM public.fazendas WHERE codigo_acesso = p_codigo LIMIT 1
$$;

-- Função para criar uma nova fazenda (sem auth)
CREATE OR REPLACE FUNCTION public.criar_fazenda(p_nome TEXT, p_codigo TEXT)
RETURNS TABLE(id UUID, nome TEXT, codigo_acesso TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.fazendas(nome, codigo_acesso) VALUES (p_nome, p_codigo) RETURNING fazendas.id INTO v_id;
  RETURN QUERY SELECT f.id, f.nome, f.codigo_acesso FROM public.fazendas f WHERE f.id = v_id;
END;
$$;

ALTER TABLE public.fazendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ninguem_le_fazendas_direto" ON public.fazendas FOR SELECT USING (false);

-- =========== Granja: lotes e entradas ===========
CREATE TABLE public.lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  data_entrada DATE NOT NULL,
  quantidade_inicial INTEGER NOT NULL,
  integradora TEXT,
  previsao_abate_dias INTEGER NOT NULL DEFAULT 42,
  percentual_lucro NUMERIC NOT NULL DEFAULT 0,
  preco_kg_vivo NUMERIC,
  encerrado BOOLEAN NOT NULL DEFAULT false,
  autor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lote_entradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  mortalidade INTEGER NOT NULL DEFAULT 0,
  peso_medio_g NUMERIC,
  observacoes TEXT,
  autor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========== Energia ===========
CREATE TABLE public.medidores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo_instalacao TEXT,
  codigo_relogio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.leituras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medidor_id UUID NOT NULL REFERENCES public.medidores(id) ON DELETE CASCADE,
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  valor NUMERIC NOT NULL,
  autor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========== Gado ===========
CREATE TABLE public.pastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  area_ha NUMERIC,
  capacidade INTEGER,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.animais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  brinco TEXT NOT NULL,
  nome TEXT,
  sexo TEXT NOT NULL,
  raca TEXT,
  categoria TEXT,
  nascimento DATE,
  peso_entrada_kg NUMERIC,
  data_entrada DATE NOT NULL,
  origem TEXT,
  preco_compra NUMERIC,
  pasto_id UUID REFERENCES public.pastos(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ativo',
  saida_data DATE,
  saida_motivo TEXT,
  preco_venda NUMERIC,
  peso_venda_kg NUMERIC,
  observacoes TEXT,
  autor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pesagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL REFERENCES public.animais(id) ON DELETE CASCADE,
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  peso_kg NUMERIC NOT NULL,
  observacoes TEXT,
  autor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sanidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL REFERENCES public.animais(id) ON DELETE CASCADE,
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo TEXT NOT NULL,
  produto TEXT NOT NULL,
  dose TEXT,
  proxima_data DATE,
  observacoes TEXT,
  autor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========== Diário ===========
CREATE TABLE public.diario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'geral',
  texto TEXT,
  clima JSONB,
  gps JSONB,
  fotos JSONB NOT NULL DEFAULT '[]'::jsonb,
  autor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========== Tarefas ===========
CREATE TABLE public.tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  vencimento DATE,
  prioridade TEXT NOT NULL DEFAULT 'media',
  categoria TEXT NOT NULL DEFAULT 'geral',
  concluida BOOLEAN NOT NULL DEFAULT false,
  autor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========== Estoque ===========
CREATE TABLE public.estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'outro',
  unidade TEXT NOT NULL DEFAULT 'un',
  quantidade NUMERIC NOT NULL DEFAULT 0,
  minimo NUMERIC,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.estoque_mov (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.estoque(id) ON DELETE CASCADE,
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo TEXT NOT NULL,
  quantidade NUMERIC NOT NULL,
  nota TEXT,
  autor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========== Financeiro ===========
CREATE TABLE public.financeiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  modulo TEXT,
  autor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========== RLS para todas: fazenda_id deve casar com header ===========
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['lotes','lote_entradas','medidores','leituras','pastos','animais','pesagens','sanidade','diario','tarefas','estoque','estoque_mov','financeiro']) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "fazenda_select" ON public.%I FOR SELECT USING (fazenda_id = public.current_fazenda_id())', t);
    EXECUTE format('CREATE POLICY "fazenda_insert" ON public.%I FOR INSERT WITH CHECK (fazenda_id = public.current_fazenda_id())', t);
    EXECUTE format('CREATE POLICY "fazenda_update" ON public.%I FOR UPDATE USING (fazenda_id = public.current_fazenda_id())', t);
    EXECUTE format('CREATE POLICY "fazenda_delete" ON public.%I FOR DELETE USING (fazenda_id = public.current_fazenda_id())', t);
  END LOOP;
END $$;

-- =========== Realtime ===========
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['lotes','lote_entradas','medidores','leituras','pastos','animais','pesagens','sanidade','diario','tarefas','estoque','estoque_mov','financeiro']) LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
  END LOOP;
END $$;

-- =========== Storage: bucket público para fotos ===========
INSERT INTO storage.buckets (id, name, public) VALUES ('fotos', 'fotos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "fotos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'fotos');
CREATE POLICY "fotos_public_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'fotos');
CREATE POLICY "fotos_public_delete" ON storage.objects FOR DELETE USING (bucket_id = 'fotos');
