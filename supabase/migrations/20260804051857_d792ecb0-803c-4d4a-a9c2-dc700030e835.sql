CREATE TABLE public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  responsavel text,
  categoria text NOT NULL DEFAULT 'outro',
  endereco text,
  cidade text,
  estado text,
  cep text,
  telefone text,
  whatsapp text,
  email text,
  observacoes text,
  foto_url text,
  favorito boolean NOT NULL DEFAULT false,
  latitude numeric,
  longitude numeric,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fornecedores_select" ON public.fornecedores FOR SELECT USING (fazenda_id = public.current_fazenda_id());
CREATE POLICY "fornecedores_insert" ON public.fornecedores FOR INSERT WITH CHECK (fazenda_id = public.current_fazenda_id());
CREATE POLICY "fornecedores_update" ON public.fornecedores FOR UPDATE USING (fazenda_id = public.current_fazenda_id()) WITH CHECK (fazenda_id = public.current_fazenda_id());
CREATE POLICY "fornecedores_delete" ON public.fornecedores FOR DELETE USING (fazenda_id = public.current_fazenda_id());

CREATE INDEX idx_fornecedores_fazenda ON public.fornecedores(fazenda_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();