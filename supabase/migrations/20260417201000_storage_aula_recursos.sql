-- Bucket para recursos de módulos (PDF y otros archivos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'aula-recursos',
  'aula-recursos',
  true,
  26214400,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Aula recursos read auth" ON storage.objects;
DROP POLICY IF EXISTS "Aula recursos insert auth" ON storage.objects;
DROP POLICY IF EXISTS "Aula recursos update auth" ON storage.objects;
DROP POLICY IF EXISTS "Aula recursos delete auth" ON storage.objects;

CREATE POLICY "Aula recursos read auth"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'aula-recursos');

CREATE POLICY "Aula recursos insert auth"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'aula-recursos');

CREATE POLICY "Aula recursos update auth"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'aula-recursos')
WITH CHECK (bucket_id = 'aula-recursos');

CREATE POLICY "Aula recursos delete auth"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'aula-recursos');
