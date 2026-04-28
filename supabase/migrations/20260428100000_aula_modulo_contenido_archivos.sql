-- ============================================================================
-- Añade contenido enriquecido a los módulos del aula:
--   1. Columna contenido_md en aula_modulo  (cuerpo markdown del módulo)
--   2. Tabla aula_modulo_archivo            (archivos adjuntos: PDF, docs, imágenes)
--   3. RLS para ambos
--   4. Bucket aula-recursos ya existe; sólo reforzamos los límites si es la
--      primera vez (upsert inocuo).
-- ============================================================================

-- ─── 1. contenido_md en aula_modulo ─────────────────────────────────────────
ALTER TABLE public.aula_modulo
  ADD COLUMN IF NOT EXISTS contenido_md text;

-- ─── 2. Tabla aula_modulo_archivo ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.aula_modulo_archivo (
  id_archivo        bigserial PRIMARY KEY,
  id_aula_modulo    bigint        NOT NULL REFERENCES public.aula_modulo(id_aula_modulo) ON DELETE CASCADE,
  nombre            text          NOT NULL,
  storage_path      text          NOT NULL,   -- path dentro del bucket aula-recursos
  tipo_mime         text,
  tamano_bytes      bigint,
  orden             int           NOT NULL DEFAULT 1,
  creado_en         timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aula_modulo_archivo_modulo
  ON public.aula_modulo_archivo(id_aula_modulo);

ALTER TABLE public.aula_modulo_archivo ENABLE ROW LEVEL SECURITY;

-- ─── 3. RLS aula_modulo_archivo ─────────────────────────────────────────────

-- Líderes y admins ven y gestionan los archivos de sus cursos
DROP POLICY IF EXISTS "Gestion archivos modulo" ON public.aula_modulo_archivo;
CREATE POLICY "Gestion archivos modulo" ON public.aula_modulo_archivo
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
        FROM public.aula_modulo am
        JOIN public.aula_curso  ac ON ac.id_aula_curso = am.id_aula_curso
       WHERE am.id_aula_modulo = aula_modulo_archivo.id_aula_modulo
         AND (
               ac.id_usuario_creador = public.current_usuario_id()
               OR ac.id_ministerio IN (SELECT id_ministerio FROM get_user_ministerios())
             )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
        FROM public.aula_modulo am
        JOIN public.aula_curso  ac ON ac.id_aula_curso = am.id_aula_curso
       WHERE am.id_aula_modulo = aula_modulo_archivo.id_aula_modulo
         AND (
               ac.id_usuario_creador = public.current_usuario_id()
               OR ac.id_ministerio IN (SELECT id_ministerio FROM get_user_ministerios())
             )
    )
  );

-- Servidores inscritos en el curso pueden leer los archivos de módulos publicados
DROP POLICY IF EXISTS "Lectura archivos modulo inscrito" ON public.aula_modulo_archivo;
CREATE POLICY "Lectura archivos modulo inscrito" ON public.aula_modulo_archivo
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.aula_modulo am
        JOIN public.aula_curso  ac ON ac.id_aula_curso = am.id_aula_curso
        JOIN public.aula_inscripcion ai ON ai.id_aula_curso = ac.id_aula_curso
       WHERE am.id_aula_modulo = aula_modulo_archivo.id_aula_modulo
         AND am.publicado = true
         AND ai.id_usuario = public.current_usuario_id()
         AND ai.activo = true
    )
  );

-- ─── 4. RLS contenido_md en aula_modulo ─────────────────────────────────────
-- aula_modulo ya tiene RLS; las políticas existentes cubren SELECT/UPDATE.
-- La columna contenido_md queda automáticamente protegida.

-- ─── 5. Bucket aula-recursos — refuerzo de límites ──────────────────────────
UPDATE storage.buckets
   SET file_size_limit  = 26214400,   -- 25 MB
       allowed_mime_types = ARRAY[
         'application/pdf',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.ms-excel',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/vnd.ms-powerpoint',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation',
         'text/plain',
         'text/csv',
         'image/png',
         'image/jpeg',
         'image/webp',
         'application/zip',
         'application/x-zip-compressed'
       ]
 WHERE id = 'aula-recursos';
