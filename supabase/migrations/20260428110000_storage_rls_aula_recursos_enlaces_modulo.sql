-- ============================================================================
-- 1. Storage policies for aula-recursos bucket
-- ============================================================================

-- INSERT: Líderes/admins suben archivos a módulos de sus cursos
DROP POLICY IF EXISTS "Aula recursos insert" ON storage.objects;
CREATE POLICY "Aula recursos insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'aula-recursos'
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1
          FROM public.aula_modulo am
          JOIN public.aula_curso  ac ON ac.id_aula_curso = am.id_aula_curso
         WHERE am.id_aula_modulo = ((regexp_match(name, '^modulo-(\d+)/'))[1])::bigint
           AND (
                 ac.id_usuario_creador = public.current_usuario_id()
                 OR ac.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
               )
      )
    )
  );

-- SELECT: Líderes/admins + Servidores inscritos en módulos publicados
DROP POLICY IF EXISTS "Aula recursos select" ON storage.objects;
CREATE POLICY "Aula recursos select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'aula-recursos'
    AND (
      public.is_super_admin()
      -- Líder / admin del curso (puede ver borradores también)
      OR EXISTS (
        SELECT 1
          FROM public.aula_modulo am
          JOIN public.aula_curso  ac ON ac.id_aula_curso = am.id_aula_curso
         WHERE am.id_aula_modulo = ((regexp_match(name, '^modulo-(\d+)/'))[1])::bigint
           AND (
                 ac.id_usuario_creador = public.current_usuario_id()
                 OR ac.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
               )
      )
      -- Servidor inscrito activo (solo módulos publicados)
      OR EXISTS (
        SELECT 1
          FROM public.aula_modulo     am
          JOIN public.aula_curso       ac ON ac.id_aula_curso = am.id_aula_curso
          JOIN public.aula_inscripcion ai ON ai.id_aula_curso = ac.id_aula_curso
         WHERE am.id_aula_modulo = ((regexp_match(name, '^modulo-(\d+)/'))[1])::bigint
           AND am.publicado  = true
           AND ai.id_usuario = public.current_usuario_id()
           AND ai.activo     = true
      )
    )
  );

-- DELETE: Líderes/admins eliminan archivos de sus módulos
DROP POLICY IF EXISTS "Aula recursos delete" ON storage.objects;
CREATE POLICY "Aula recursos delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'aula-recursos'
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1
          FROM public.aula_modulo am
          JOIN public.aula_curso  ac ON ac.id_aula_curso = am.id_aula_curso
         WHERE am.id_aula_modulo = ((regexp_match(name, '^modulo-(\d+)/'))[1])::bigint
           AND (
                 ac.id_usuario_creador = public.current_usuario_id()
                 OR ac.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
               )
      )
    )
  );

-- UPDATE: necesario para el upsert que usa el SDK internamente
DROP POLICY IF EXISTS "Aula recursos update" ON storage.objects;
CREATE POLICY "Aula recursos update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'aula-recursos'
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1
          FROM public.aula_modulo am
          JOIN public.aula_curso  ac ON ac.id_aula_curso = am.id_aula_curso
         WHERE am.id_aula_modulo = ((regexp_match(name, '^modulo-(\d+)/'))[1])::bigint
           AND (
                 ac.id_usuario_creador = public.current_usuario_id()
                 OR ac.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
               )
      )
    )
  )
  WITH CHECK (
    bucket_id = 'aula-recursos'
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1
          FROM public.aula_modulo am
          JOIN public.aula_curso  ac ON ac.id_aula_curso = am.id_aula_curso
         WHERE am.id_aula_modulo = ((regexp_match(name, '^modulo-(\d+)/'))[1])::bigint
           AND (
                 ac.id_usuario_creador = public.current_usuario_id()
                 OR ac.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
               )
      )
    )
  );

-- ============================================================================
-- 2. Tabla aula_modulo_enlace
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.aula_modulo_enlace (
  id_enlace      bigserial   PRIMARY KEY,
  id_aula_modulo bigint      NOT NULL REFERENCES public.aula_modulo(id_aula_modulo) ON DELETE CASCADE,
  titulo         text        NOT NULL,
  url            text        NOT NULL,
  descripcion    text,
  orden          int         NOT NULL DEFAULT 1,
  creado_en      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aula_modulo_enlace_modulo
  ON public.aula_modulo_enlace(id_aula_modulo);

ALTER TABLE public.aula_modulo_enlace ENABLE ROW LEVEL SECURITY;

-- Líderes/admins: gestión completa
DROP POLICY IF EXISTS "Gestion enlaces modulo" ON public.aula_modulo_enlace;
CREATE POLICY "Gestion enlaces modulo" ON public.aula_modulo_enlace
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
        FROM public.aula_modulo am
        JOIN public.aula_curso  ac ON ac.id_aula_curso = am.id_aula_curso
       WHERE am.id_aula_modulo = aula_modulo_enlace.id_aula_modulo
         AND (
               ac.id_usuario_creador = public.current_usuario_id()
               OR ac.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
             )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
        FROM public.aula_modulo am
        JOIN public.aula_curso  ac ON ac.id_aula_curso = am.id_aula_curso
       WHERE am.id_aula_modulo = aula_modulo_enlace.id_aula_modulo
         AND (
               ac.id_usuario_creador = public.current_usuario_id()
               OR ac.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
             )
    )
  );

-- Servidores inscritos: lectura de módulos publicados
DROP POLICY IF EXISTS "Lectura enlaces modulo inscrito" ON public.aula_modulo_enlace;
CREATE POLICY "Lectura enlaces modulo inscrito" ON public.aula_modulo_enlace
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.aula_modulo     am
        JOIN public.aula_curso       ac ON ac.id_aula_curso = am.id_aula_curso
        JOIN public.aula_inscripcion ai ON ai.id_aula_curso = ac.id_aula_curso
       WHERE am.id_aula_modulo = aula_modulo_enlace.id_aula_modulo
         AND am.publicado  = true
         AND ai.id_usuario = public.current_usuario_id()
         AND ai.activo     = true
    )
  );
