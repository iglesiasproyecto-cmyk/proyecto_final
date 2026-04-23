-- Hardening RLS formación:
-- Lider puede administrar CRUD de formacion SOLO en su ministerio.
-- Admin de iglesia mantiene alcance por iglesia. Super admin mantiene alcance global.

CREATE OR REPLACE FUNCTION public.can_manage_ministerio_formacion_scope(target_ministerio_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin()
    OR public.is_admin_of_iglesia(public.get_iglesia_for_ministerio(target_ministerio_id))
    OR public.is_lider_of_ministerio(target_ministerio_id);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_curso_scope(target_curso_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.curso c
    WHERE c.id_curso = target_curso_id
      AND public.can_manage_ministerio_formacion_scope(c.id_ministerio)
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_ministerio_formacion_scope(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_curso_scope(bigint) TO authenticated;

-- curso
DROP POLICY IF EXISTS "Lider puede insertar curso" ON public.curso;
DROP POLICY IF EXISTS "Lider puede actualizar curso" ON public.curso;
DROP POLICY IF EXISTS "Admin puede borrar curso" ON public.curso;
DROP POLICY IF EXISTS "Lectura cursos por iglesia" ON public.curso;
DROP POLICY IF EXISTS "Scoped insert curso" ON public.curso;
DROP POLICY IF EXISTS "Scoped update curso" ON public.curso;
DROP POLICY IF EXISTS "Scoped delete curso" ON public.curso;
DROP POLICY IF EXISTS "Lectura curso por gestion o inscripcion" ON public.curso;

CREATE POLICY "Scoped insert curso"
  ON public.curso FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_ministerio_formacion_scope(id_ministerio));

CREATE POLICY "Scoped update curso"
  ON public.curso FOR UPDATE
  TO authenticated
  USING (public.can_manage_ministerio_formacion_scope(id_ministerio))
  WITH CHECK (public.can_manage_ministerio_formacion_scope(id_ministerio));

CREATE POLICY "Scoped delete curso"
  ON public.curso FOR DELETE
  TO authenticated
  USING (public.can_manage_ministerio_formacion_scope(id_ministerio));

CREATE POLICY "Lectura curso por gestion o inscripcion"
  ON public.curso FOR SELECT
  TO authenticated
  USING (
    public.can_manage_ministerio_formacion_scope(id_ministerio)
    OR EXISTS (
      SELECT 1
      FROM public.proceso_asignado_curso pac
      JOIN public.detalle_proceso_curso d ON d.id_proceso_asignado_curso = pac.id_proceso_asignado_curso
      WHERE pac.id_curso = curso.id_curso
        AND d.id_usuario = public.current_usuario_id()
        AND d.estado IN ('inscrito', 'en_progreso', 'completado')
    )
  );

-- modulo
DROP POLICY IF EXISTS "Lider puede insertar modulo" ON public.modulo;
DROP POLICY IF EXISTS "Lider puede actualizar modulo" ON public.modulo;
DROP POLICY IF EXISTS "Admin puede borrar modulo" ON public.modulo;
DROP POLICY IF EXISTS "Scoped insert modulo" ON public.modulo;
DROP POLICY IF EXISTS "Scoped update modulo" ON public.modulo;
DROP POLICY IF EXISTS "Scoped delete modulo" ON public.modulo;
DROP POLICY IF EXISTS "Lectura modulo por gestion o inscripcion" ON public.modulo;

CREATE POLICY "Scoped insert modulo"
  ON public.modulo FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_curso_scope(id_curso));

CREATE POLICY "Scoped update modulo"
  ON public.modulo FOR UPDATE
  TO authenticated
  USING (public.can_manage_curso_scope(id_curso))
  WITH CHECK (public.can_manage_curso_scope(id_curso));

CREATE POLICY "Scoped delete modulo"
  ON public.modulo FOR DELETE
  TO authenticated
  USING (public.can_manage_curso_scope(id_curso));

CREATE POLICY "Lectura modulo por gestion o inscripcion"
  ON public.modulo FOR SELECT
  TO authenticated
  USING (
    public.can_manage_curso_scope(id_curso)
    OR public.can_read_modulo_as_student(id_modulo)
  );

-- recurso
DROP POLICY IF EXISTS "Lider puede insertar recurso" ON public.recurso;
DROP POLICY IF EXISTS "Lider puede actualizar recurso" ON public.recurso;
DROP POLICY IF EXISTS "Admin puede borrar recurso" ON public.recurso;
DROP POLICY IF EXISTS "Lectura autenticada" ON public.recurso;
DROP POLICY IF EXISTS "Scoped insert recurso" ON public.recurso;
DROP POLICY IF EXISTS "Scoped update recurso" ON public.recurso;
DROP POLICY IF EXISTS "Scoped delete recurso" ON public.recurso;
DROP POLICY IF EXISTS "Lectura recurso por gestion o inscripcion" ON public.recurso;

CREATE POLICY "Scoped insert recurso"
  ON public.recurso FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.modulo m
      WHERE m.id_modulo = recurso.id_modulo
        AND public.can_manage_curso_scope(m.id_curso)
    )
  );

CREATE POLICY "Scoped update recurso"
  ON public.recurso FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.modulo m
      WHERE m.id_modulo = recurso.id_modulo
        AND public.can_manage_curso_scope(m.id_curso)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.modulo m
      WHERE m.id_modulo = recurso.id_modulo
        AND public.can_manage_curso_scope(m.id_curso)
    )
  );

CREATE POLICY "Scoped delete recurso"
  ON public.recurso FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.modulo m
      WHERE m.id_modulo = recurso.id_modulo
        AND public.can_manage_curso_scope(m.id_curso)
    )
  );

CREATE POLICY "Lectura recurso por gestion o inscripcion"
  ON public.recurso FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.modulo m
      WHERE m.id_modulo = recurso.id_modulo
        AND (
          public.can_manage_curso_scope(m.id_curso)
          OR public.can_read_modulo_as_student(m.id_modulo)
        )
    )
  );

-- evaluacion
DROP POLICY IF EXISTS "Lider puede insertar evaluacion" ON public.evaluacion;
DROP POLICY IF EXISTS "Lider puede actualizar evaluacion" ON public.evaluacion;
DROP POLICY IF EXISTS "Admin puede borrar evaluacion" ON public.evaluacion;
DROP POLICY IF EXISTS "Scoped insert evaluacion" ON public.evaluacion;
DROP POLICY IF EXISTS "Scoped update evaluacion" ON public.evaluacion;
DROP POLICY IF EXISTS "Scoped delete evaluacion" ON public.evaluacion;
DROP POLICY IF EXISTS "Lectura evaluacion por gestion u own" ON public.evaluacion;

CREATE POLICY "Scoped insert evaluacion"
  ON public.evaluacion FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.modulo m
      WHERE m.id_modulo = evaluacion.id_modulo
        AND public.can_manage_curso_scope(m.id_curso)
    )
  );

CREATE POLICY "Scoped update evaluacion"
  ON public.evaluacion FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.modulo m
      WHERE m.id_modulo = evaluacion.id_modulo
        AND public.can_manage_curso_scope(m.id_curso)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.modulo m
      WHERE m.id_modulo = evaluacion.id_modulo
        AND public.can_manage_curso_scope(m.id_curso)
    )
  );

CREATE POLICY "Scoped delete evaluacion"
  ON public.evaluacion FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.modulo m
      WHERE m.id_modulo = evaluacion.id_modulo
        AND public.can_manage_curso_scope(m.id_curso)
    )
  );

CREATE POLICY "Lectura evaluacion por gestion u own"
  ON public.evaluacion FOR SELECT
  TO authenticated
  USING (
    id_usuario = public.current_usuario_id()
    OR EXISTS (
      SELECT 1
      FROM public.modulo m
      WHERE m.id_modulo = evaluacion.id_modulo
        AND public.can_manage_curso_scope(m.id_curso)
    )
  );

-- proceso_asignado_curso
DROP POLICY IF EXISTS "Admin puede insertar proceso_asignado_curso" ON public.proceso_asignado_curso;
DROP POLICY IF EXISTS "Admin puede actualizar proceso_asignado_curso" ON public.proceso_asignado_curso;
DROP POLICY IF EXISTS "Admin puede borrar proceso_asignado_curso" ON public.proceso_asignado_curso;
DROP POLICY IF EXISTS "Lectura autenticada" ON public.proceso_asignado_curso;
DROP POLICY IF EXISTS "Scoped insert proceso_asignado_curso" ON public.proceso_asignado_curso;
DROP POLICY IF EXISTS "Scoped update proceso_asignado_curso" ON public.proceso_asignado_curso;
DROP POLICY IF EXISTS "Scoped delete proceso_asignado_curso" ON public.proceso_asignado_curso;
DROP POLICY IF EXISTS "Lectura proceso por gestion o inscripcion" ON public.proceso_asignado_curso;

CREATE POLICY "Scoped insert proceso_asignado_curso"
  ON public.proceso_asignado_curso FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_curso_scope(id_curso));

CREATE POLICY "Scoped update proceso_asignado_curso"
  ON public.proceso_asignado_curso FOR UPDATE
  TO authenticated
  USING (public.can_manage_curso_scope(id_curso))
  WITH CHECK (public.can_manage_curso_scope(id_curso));

CREATE POLICY "Scoped delete proceso_asignado_curso"
  ON public.proceso_asignado_curso FOR DELETE
  TO authenticated
  USING (public.can_manage_curso_scope(id_curso));

CREATE POLICY "Lectura proceso por gestion o inscripcion"
  ON public.proceso_asignado_curso FOR SELECT
  TO authenticated
  USING (
    public.can_manage_curso_scope(id_curso)
    OR EXISTS (
      SELECT 1
      FROM public.detalle_proceso_curso d
      WHERE d.id_proceso_asignado_curso = proceso_asignado_curso.id_proceso_asignado_curso
        AND d.id_usuario = public.current_usuario_id()
        AND d.estado IN ('inscrito', 'en_progreso', 'completado')
    )
  );
