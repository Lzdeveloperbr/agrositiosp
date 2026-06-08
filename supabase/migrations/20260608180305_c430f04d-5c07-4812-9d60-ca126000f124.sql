-- Restrict UPDATE/DELETE on fotos bucket to files belonging to the current fazenda
DROP POLICY IF EXISTS "fotos_update_own_fazenda" ON storage.objects;
DROP POLICY IF EXISTS "fotos_delete_own_fazenda" ON storage.objects;

CREATE POLICY "fotos_update_own_fazenda"
ON storage.objects FOR UPDATE TO anon, authenticated
USING (
  bucket_id = 'fotos'
  AND (storage.foldername(name))[1] = public.current_fazenda_id()::text
)
WITH CHECK (
  bucket_id = 'fotos'
  AND (storage.foldername(name))[1] = public.current_fazenda_id()::text
);

CREATE POLICY "fotos_delete_own_fazenda"
ON storage.objects FOR DELETE TO anon, authenticated
USING (
  bucket_id = 'fotos'
  AND (storage.foldername(name))[1] = public.current_fazenda_id()::text
);