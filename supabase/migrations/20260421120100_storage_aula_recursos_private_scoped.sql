-- Cambia el bucket aula-recursos a privado y reemplaza las policies genericas
-- (solo "bucket_id = 'aula-recursos'") por policies con scope por curso/modulo.
--
-- Layout de paths asumido por el uploader frontend:
--   aula-recursos/modulo-<id_modulo>/<filename>
--
-- Se extrae <id_modulo> del nombre del objeto y se valida que:
--   - INSERT/UPDATE/DELETE: el invocador sea gestor del curso (can_manage_curso_scope)
--   - SELECT: gestor del curso O inscrito en el modulo (can_read_modulo_as_student)
--
-- Backfill: las URLs publicas almacenadas en recurso.url se reducen al path
-- relativo para que el frontend pueda firmarlas con createSignedUrl.

UPDATE storage.buckets SET public = false WHERE id = 'aula-recursos';

DROP POLICY IF EXISTS "Aula recursos read auth" ON storage.objects;
DROP POLICY IF EXISTS "Aula recursos insert auth" ON storage.objects;
DROP POLICY IF EXISTS "Aula recursos update auth" ON storage.objects;
DROP POLICY IF EXISTS "Aula recursos delete auth" ON storage.objects;
DROP POLICY IF EXISTS "Aula recursos read scoped" ON storage.objects;
DROP POLICY IF EXISTS "Aula recursos insert scoped" ON storage.objects;
DROP POLICY IF EXISTS "Aula recursos update scoped" ON storage.objects;
DROP POLICY IF EXISTS "Aula recursos delete scoped" ON storage.objects;

CREATE OR REPLACE FUNCTION public.aula_recursos_modulo_id_from_name(object_name text)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(split_part(object_name, '/', 1), '-', 2), '')::bigint;
$$;

GRANT EXECUTE ON FUNCTION public.aula_recursos_modulo_id_from_name(text) TO authenticated;

CREATE POLICY "Aula recursos read scoped"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'aula-recursos'
  AND EXISTS (
    SELECT 1
    FROM public.modulo m
    WHERE m.id_modulo = public.aula_recursos_modulo_id_from_name(name)
      AND (
        public.can_manage_curso_scope(m.id_curso)
        OR public.can_read_modulo_as_student(m.id_modulo)
      )
  )
);

CREATE POLICY "Aula recursos insert scoped"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'aula-recursos'
  AND EXISTS (
    SELECT 1
    FROM public.modulo m
    WHERE m.id_modulo = public.aula_recursos_modulo_id_from_name(name)
      AND public.can_manage_curso_scope(m.id_curso)
  )
);

CREATE POLICY "Aula recursos update scoped"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'aula-recursos'
  AND EXISTS (
    SELECT 1
    FROM public.modulo m
    WHERE m.id_modulo = public.aula_recursos_modulo_id_from_name(name)
      AND public.can_manage_curso_scope(m.id_curso)
  )
)
WITH CHECK (
  bucket_id = 'aula-recursos'
  AND EXISTS (
    SELECT 1
    FROM public.modulo m
    WHERE m.id_modulo = public.aula_recursos_modulo_id_from_name(name)
      AND public.can_manage_curso_scope(m.id_curso)
  )
);

CREATE POLICY "Aula recursos delete scoped"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'aula-recursos'
  AND EXISTS (
    SELECT 1
    FROM public.modulo m
    WHERE m.id_modulo = public.aula_recursos_modulo_id_from_name(name)
      AND public.can_manage_curso_scope(m.id_curso)
  )
);

-- Backfill: los recursos existentes tienen URL publica completa.
-- Al pasar el bucket a privado esas URLs dejan de funcionar, asi que se reducen
-- al path relativo (p.ej. "modulo-5/abc.pdf") y el frontend generara signed URLs.
UPDATE public.recurso
SET url = regexp_replace(url, '^https?://[^/]+/storage/v1/object/public/aula-recursos/', '')
WHERE tipo = 'archivo'
  AND url LIKE '%/storage/v1/object/public/aula-recursos/%';
