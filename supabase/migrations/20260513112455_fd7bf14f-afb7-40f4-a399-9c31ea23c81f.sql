
ALTER TABLE public.fazendas
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS cidade text;

CREATE TABLE IF NOT EXISTS public.plantios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL,
  cultura text NOT NULL,
  variedade text,
  area_ha numeric NOT NULL DEFAULT 0,
  quantidade_sementes numeric,
  unidade_sementes text,
  tipo_solo text,
  local text,
  data_plantio date NOT NULL,
  previsao_colheita date,
  data_colheita date,
  produtividade_kg numeric,
  preco_kg numeric,
  status text NOT NULL DEFAULT 'plantado',
  tratos jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacoes text,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plantios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fazenda_select ON public.plantios;
DROP POLICY IF EXISTS fazenda_insert ON public.plantios;
DROP POLICY IF EXISTS fazenda_update ON public.plantios;
DROP POLICY IF EXISTS fazenda_delete ON public.plantios;

CREATE POLICY fazenda_select ON public.plantios FOR SELECT USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_insert ON public.plantios FOR INSERT WITH CHECK (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_update ON public.plantios FOR UPDATE USING (fazenda_id = current_fazenda_id());
CREATE POLICY fazenda_delete ON public.plantios FOR DELETE USING (fazenda_id = current_fazenda_id());

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.plantios;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP FUNCTION IF EXISTS public.entrar_fazenda(text);
DROP FUNCTION IF EXISTS public.criar_fazenda(text, text);

CREATE FUNCTION public.entrar_fazenda(p_codigo text)
RETURNS TABLE(id uuid, nome text, latitude numeric, longitude numeric, cidade text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, nome, latitude, longitude, cidade FROM public.fazendas WHERE codigo_acesso = p_codigo LIMIT 1
$$;

CREATE FUNCTION public.criar_fazenda(p_nome text, p_codigo text)
RETURNS TABLE(id uuid, nome text, codigo_acesso text, latitude numeric, longitude numeric, cidade text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.fazendas(nome, codigo_acesso) VALUES (p_nome, p_codigo) RETURNING fazendas.id INTO v_id;
  RETURN QUERY SELECT f.id, f.nome, f.codigo_acesso, f.latitude, f.longitude, f.cidade FROM public.fazendas f WHERE f.id = v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_coords_fazenda(p_codigo text, p_lat numeric, p_lon numeric, p_cidade text)
RETURNS TABLE(id uuid, latitude numeric, longitude numeric, cidade text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.fazendas
    SET latitude = p_lat, longitude = p_lon, cidade = COALESCE(p_cidade, cidade)
    WHERE codigo_acesso = p_codigo;
  RETURN QUERY SELECT f.id, f.latitude, f.longitude, f.cidade FROM public.fazendas f WHERE f.codigo_acesso = p_codigo;
END;
$$;
