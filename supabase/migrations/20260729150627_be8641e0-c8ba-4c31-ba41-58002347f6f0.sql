CREATE TABLE public.mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  autor text NOT NULL,
  texto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.mensagens TO anon;
GRANT SELECT, INSERT ON public.mensagens TO authenticated;
GRANT ALL ON public.mensagens TO service_role;

ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mensagens_select_fazenda" ON public.mensagens
FOR SELECT USING (fazenda_id = public.current_fazenda_id());

CREATE POLICY "mensagens_insert_fazenda" ON public.mensagens
FOR INSERT WITH CHECK (fazenda_id = public.current_fazenda_id());

CREATE INDEX idx_mensagens_fazenda_data ON public.mensagens (fazenda_id, created_at);

ALTER TABLE public.mensagens REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens;