-- ============================================================================
-- Fix RLS policies that used get_user_ministerios() with bare SELECT which
-- fails when the function returns SETOF record (column name unknown at
-- plan time → 500 on every query).
-- Replace with inline miembro_ministerio subquery in all affected policies.
-- ============================================================================

-- ─── 1. aula_modulo_archivo ──────────────────────────────────────────────────

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
               OR ac.id_ministerio IN (
                 SELECT mm.id_ministerio
                   FROM public.miembro_ministerio mm
                  WHERE mm.id_usuario = public.current_usuario_id()
                    AND mm.fecha_salida IS NULL
               )
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
               OR ac.id_ministerio IN (
                 SELECT mm.id_ministerio
                   FROM public.miembro_ministerio mm
                  WHERE mm.id_usuario = public.current_usuario_id()
                    AND mm.fecha_salida IS NULL
               )
             )
    )
  );

-- ─── 2. aula_modulo_enlace ───────────────────────────────────────────────────

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
               OR ac.id_ministerio IN (
                 SELECT mm.id_ministerio
                   FROM public.miembro_ministerio mm
                  WHERE mm.id_usuario = public.current_usuario_id()
                    AND mm.fecha_salida IS NULL
               )
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
               OR ac.id_ministerio IN (
                 SELECT mm.id_ministerio
                   FROM public.miembro_ministerio mm
                  WHERE mm.id_usuario = public.current_usuario_id()
                    AND mm.fecha_salida IS NULL
               )
             )
    )
  );

-- ─── 3. storage.objects — aula-recursos ─────────────────────────────────────

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
                 OR ac.id_ministerio IN (
                   SELECT mm.id_ministerio
                     FROM public.miembro_ministerio mm
                    WHERE mm.id_usuario = public.current_usuario_id()
                      AND mm.fecha_salida IS NULL
                 )
               )
      )
    )
  );

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
                 OR ac.id_ministerio IN (
                   SELECT mm.id_ministerio
                     FROM public.miembro_ministerio mm
                    WHERE mm.id_usuario = public.current_usuario_id()
                      AND mm.fecha_salida IS NULL
                 )
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
                 OR ac.id_ministerio IN (
                   SELECT mm.id_ministerio
                     FROM public.miembro_ministerio mm
                    WHERE mm.id_usuario = public.current_usuario_id()
                      AND mm.fecha_salida IS NULL
                 )
               )
      )
    )
  );

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
                 OR ac.id_ministerio IN (
                   SELECT mm.id_ministerio
                     FROM public.miembro_ministerio mm
                    WHERE mm.id_usuario = public.current_usuario_id()
                      AND mm.fecha_salida IS NULL
                 )
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
                 OR ac.id_ministerio IN (
                   SELECT mm.id_ministerio
                     FROM public.miembro_ministerio mm
                    WHERE mm.id_usuario = public.current_usuario_id()
                      AND mm.fecha_salida IS NULL
                 )
               )
      )
    )
  );
