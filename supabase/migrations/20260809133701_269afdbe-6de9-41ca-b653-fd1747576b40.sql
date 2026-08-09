CREATE TABLE public.prioridades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  mes text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  categoria text NOT NULL DEFAULT 'geral',
  prioridade text NOT NULL DEFAULT 'media',
  status text NOT NULL DEFAULT 'pendente',
  responsavel text,
  prazo date,
  custo_estimado numeric,
  custo_real numeric,
  progresso integer NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  fonte_arquivo text,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prioridades TO anon, authenticated;
GRANT ALL ON public.prioridades TO service_role;
ALTER TABLE public.prioridades ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.prioridades FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.prioridades FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.prioridades FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.prioridades FOR DELETE USING (fazenda_id = current_fazenda_id());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.prioridades FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_prioridades_fazenda_mes ON public.prioridades (fazenda_id, mes);

CREATE TABLE public.onedrive_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL UNIQUE REFERENCES public.fazendas(id) ON DELETE CASCADE,
  pasta_id text,
  pasta_nome text,
  pasta_caminho text,
  ativo boolean NOT NULL DEFAULT true,
  delta_link text,
  ultima_verificacao timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onedrive_config TO anon, authenticated;
GRANT ALL ON public.onedrive_config TO service_role;
ALTER TABLE public.onedrive_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.onedrive_config FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.onedrive_config FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.onedrive_config FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.onedrive_config FOR DELETE USING (fazenda_id = current_fazenda_id());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.onedrive_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.onedrive_arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  nome text NOT NULL,
  caminho text,
  mime text,
  tamanho bigint,
  versao text,
  modificado_em timestamptz,
  status text NOT NULL DEFAULT 'pendente',
  destino text,
  confianca numeric,
  resumo text,
  registros integer NOT NULL DEFAULT 0,
  erro text,
  processado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fazenda_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onedrive_arquivos TO anon, authenticated;
GRANT ALL ON public.onedrive_arquivos TO service_role;
ALTER TABLE public.onedrive_arquivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.onedrive_arquivos FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.onedrive_arquivos FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.onedrive_arquivos FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.onedrive_arquivos FOR DELETE USING (fazenda_id = current_fazenda_id());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.onedrive_arquivos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.importacoes_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  arquivo_id uuid REFERENCES public.onedrive_arquivos(id) ON DELETE CASCADE,
  arquivo_nome text,
  tabela text NOT NULL,
  registro_id uuid,
  acao text NOT NULL DEFAULT 'inserido',
  chave text,
  confianca numeric,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.importacoes_ia TO anon, authenticated;
GRANT ALL ON public.importacoes_ia TO service_role;
ALTER TABLE public.importacoes_ia ENABLE ROW LEVEL SECURITY;
CREATE POLICY fazenda_select ON public.importacoes_ia FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.importacoes_ia FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.importacoes_ia FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.importacoes_ia FOR DELETE USING (fazenda_id = current_fazenda_id());
CREATE INDEX idx_importacoes_fazenda ON public.importacoes_ia (fazenda_id, created_at DESC);