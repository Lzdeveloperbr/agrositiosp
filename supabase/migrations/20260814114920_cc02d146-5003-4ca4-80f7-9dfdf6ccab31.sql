
CREATE TABLE public.gdrive_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE UNIQUE,
  pasta_id text,
  pasta_nome text,
  pasta_caminho text,
  ativo boolean NOT NULL DEFAULT true,
  ultima_verificacao timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.gdrive_arquivos (
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
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gdrive_arquivos_fazenda_idx ON public.gdrive_arquivos(fazenda_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gdrive_config TO anon, authenticated;
GRANT ALL ON public.gdrive_config TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gdrive_arquivos TO anon, authenticated;
GRANT ALL ON public.gdrive_arquivos TO service_role;

ALTER TABLE public.gdrive_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdrive_arquivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY fazenda_select ON public.gdrive_config FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.gdrive_config FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.gdrive_config FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.gdrive_config FOR DELETE USING (fazenda_id = current_fazenda_id());

CREATE POLICY fazenda_select ON public.gdrive_arquivos FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.gdrive_arquivos FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.gdrive_arquivos FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.gdrive_arquivos FOR DELETE USING (fazenda_id = current_fazenda_id());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.gdrive_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.gdrive_arquivos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
