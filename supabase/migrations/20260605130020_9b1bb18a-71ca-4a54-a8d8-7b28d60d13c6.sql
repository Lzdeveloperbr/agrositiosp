
-- 1) Drop overly permissive storage policies on the public 'fotos' bucket.
--    Public URLs (CDN) still serve files; we just stop API-level DELETE and bucket listing.
DROP POLICY IF EXISTS "fotos_public_delete" ON storage.objects;
DROP POLICY IF EXISTS "fotos_public_read" ON storage.objects;

-- 2) Lock down the internal helper used inside RLS policies.
--    It is only needed when invoked by other SECURITY DEFINER calls / RLS evaluation,
--    not as a direct RPC from anon/authenticated clients.
REVOKE EXECUTE ON FUNCTION public.current_fazenda_id() FROM anon, authenticated, public;
