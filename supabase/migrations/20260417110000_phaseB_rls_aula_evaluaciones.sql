-- Phase B: hardening scope for aula/evaluaciones write operations
-- Replaces permissive authenticated policies with iglesia-scoped rules.

-- -------------------------------------------------------------------
-- Scope helpers
-- -------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_iglesia_for_ministerio(target_ministerio_id bigint)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT s.id_iglesia
  FROM public.ministerio m
  JOIN public.sede s ON s.id_sede = m.id_sede
  WHERE m.id_ministerio = target_ministerio_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_iglesia_for_curso(target_curso_id bigint)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.get_iglesia_for_ministerio(c.id_ministerio)
  FROM public.curso c
  WHERE c.id_curso = target_curso_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_ministerio_scope(target_ministerio_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    public.is_super_admin()
    OR public.is_admin_of_iglesia(public.get_iglesia_for_ministerio(target_ministerio_id));
$$;

CREATE OR REPLACE FUNCTION public.can_manage_curso_scope(target_curso_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    public.is_super_admin()
    OR public.is_admin_of_iglesia(public.get_iglesia_for_curso(target_curso_id));
$$;

GRANT EXECUTE ON FUNCTION public.get_iglesia_for_ministerio(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_iglesia_for_curso(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_ministerio_scope(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_curso_scope(bigint) TO authenticated;

-- -------------------------------------------------------------------
-- curso
-- -------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated insert curso" ON public.curso;
DROP POLICY IF EXISTS "Authenticated update curso" ON public.curso;
DROP POLICY IF EXISTS "Authenticated delete curso" ON public.curso;
DROP POLICY IF EXISTS "Scoped insert curso" ON public.curso;
DROP POLICY IF EXISTS "Scoped update curso" ON public.curso;
DROP POLICY IF EXISTS "Scoped delete curso" ON public.curso;

CREATE POLICY "Scoped insert curso"
  ON public.curso FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_ministerio_scope(id_ministerio));

CREATE POLICY "Scoped update curso"
  ON public.curso FOR UPDATE
  TO authenticated
  USING (public.can_manage_ministerio_scope(id_ministerio))
  WITH CHECK (public.can_manage_ministerio_scope(id_ministerio));

CREATE POLICY "Scoped delete curso"
  ON public.curso FOR DELETE
  TO authenticated
  USING (public.can_manage_ministerio_scope(id_ministerio));

-- -------------------------------------------------------------------
-- modulo
-- -------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated insert modulo" ON public.modulo;
DROP POLICY IF EXISTS "Authenticated update modulo" ON public.modulo;
DROP POLICY IF EXISTS "Authenticated delete modulo" ON public.modulo;
DROP POLICY IF EXISTS "Scoped insert modulo" ON public.modulo;
DROP POLICY IF EXISTS "Scoped update modulo" ON public.modulo;
DROP POLICY IF EXISTS "Scoped delete modulo" ON public.modulo;

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

-- -------------------------------------------------------------------
-- recurso
-- -------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated insert recurso" ON public.recurso;
DROP POLICY IF EXISTS "Authenticated update recurso" ON public.recurso;
DROP POLICY IF EXISTS "Authenticated delete recurso" ON public.recurso;
DROP POLICY IF EXISTS "Scoped insert recurso" ON public.recurso;
DROP POLICY IF EXISTS "Scoped update recurso" ON public.recurso;
DROP POLICY IF EXISTS "Scoped delete recurso" ON public.recurso;

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

-- -------------------------------------------------------------------
-- evaluacion
-- -------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated insert evaluacion" ON public.evaluacion;
DROP POLICY IF EXISTS "Authenticated update evaluacion" ON public.evaluacion;
DROP POLICY IF EXISTS "Authenticated delete evaluacion" ON public.evaluacion;
DROP POLICY IF EXISTS "Scoped insert evaluacion" ON public.evaluacion;
DROP POLICY IF EXISTS "Scoped update evaluacion" ON public.evaluacion;
DROP POLICY IF EXISTS "Scoped delete evaluacion" ON public.evaluacion;

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

-- -------------------------------------------------------------------
-- proceso_asignado_curso
-- -------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated update proceso_asignado_curso" ON public.proceso_asignado_curso;
DROP POLICY IF EXISTS "Scoped insert proceso_asignado_curso" ON public.proceso_asignado_curso;
DROP POLICY IF EXISTS "Scoped update proceso_asignado_curso" ON public.proceso_asignado_curso;
DROP POLICY IF EXISTS "Scoped delete proceso_asignado_curso" ON public.proceso_asignado_curso;

CREATE POLICY "Scoped insert proceso_asignado_curso"
  ON public.proceso_asignado_curso FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_curso_scope(id_curso)
    AND public.is_admin_of_iglesia(id_iglesia)
    AND id_iglesia = public.get_iglesia_for_curso(id_curso)
  );

CREATE POLICY "Scoped update proceso_asignado_curso"
  ON public.proceso_asignado_curso FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_curso_scope(id_curso)
    AND public.is_admin_of_iglesia(id_iglesia)
    AND id_iglesia = public.get_iglesia_for_curso(id_curso)
  )
  WITH CHECK (
    public.can_manage_curso_scope(id_curso)
    AND public.is_admin_of_iglesia(id_iglesia)
    AND id_iglesia = public.get_iglesia_for_curso(id_curso)
  );

CREATE POLICY "Scoped delete proceso_asignado_curso"
  ON public.proceso_asignado_curso FOR DELETE
  TO authenticated
  USING (
    public.can_manage_curso_scope(id_curso)
    AND public.is_admin_of_iglesia(id_iglesia)
    AND id_iglesia = public.get_iglesia_for_curso(id_curso)
  );

-- -------------------------------------------------------------------
-- detalle_proceso_curso
-- -------------------------------------------------------------------

DROP POLICY IF EXISTS "Scoped insert detalle_proceso_curso" ON public.detalle_proceso_curso;
DROP POLICY IF EXISTS "Scoped update detalle_proceso_curso" ON public.detalle_proceso_curso;
DROP POLICY IF EXISTS "Scoped delete detalle_proceso_curso" ON public.detalle_proceso_curso;

CREATE POLICY "Scoped insert detalle_proceso_curso"
  ON public.detalle_proceso_curso FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.proceso_asignado_curso pac
      WHERE pac.id_proceso_asignado_curso = detalle_proceso_curso.id_proceso_asignado_curso
        AND public.can_manage_curso_scope(pac.id_curso)
        AND public.is_admin_of_iglesia(pac.id_iglesia)
    )
  );

CREATE POLICY "Scoped update detalle_proceso_curso"
  ON public.detalle_proceso_curso FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.proceso_asignado_curso pac
      WHERE pac.id_proceso_asignado_curso = detalle_proceso_curso.id_proceso_asignado_curso
        AND public.can_manage_curso_scope(pac.id_curso)
        AND public.is_admin_of_iglesia(pac.id_iglesia)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.proceso_asignado_curso pac
      WHERE pac.id_proceso_asignado_curso = detalle_proceso_curso.id_proceso_asignado_curso
        AND public.can_manage_curso_scope(pac.id_curso)
        AND public.is_admin_of_iglesia(pac.id_iglesia)
    )
  );

CREATE POLICY "Scoped delete detalle_proceso_curso"
  ON public.detalle_proceso_curso FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.proceso_asignado_curso pac
      WHERE pac.id_proceso_asignado_curso = detalle_proceso_curso.id_proceso_asignado_curso
        AND public.can_manage_curso_scope(pac.id_curso)
        AND public.is_admin_of_iglesia(pac.id_iglesia)
    )
  );
