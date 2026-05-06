
ALTER TABLE public.lotes ADD COLUMN entries JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.medidores ADD COLUMN leituras JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.animais ADD COLUMN pesagens JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.animais ADD COLUMN sanidade JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.estoque ADD COLUMN movimentacoes JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Não vamos mais usar essas tabelas:
DROP TABLE IF EXISTS public.lote_entradas CASCADE;
DROP TABLE IF EXISTS public.leituras CASCADE;
DROP TABLE IF EXISTS public.pesagens CASCADE;
DROP TABLE IF EXISTS public.sanidade CASCADE;
DROP TABLE IF EXISTS public.estoque_mov CASCADE;
