-- Performance hardening:
-- 1) Replace auth.uid() with (select auth.uid()) in RLS policies flagged by auth_rls_initplan.
-- 2) Remove redundant permissive SELECT policy on tarea to avoid multiple_permissive_policies warning.

-- evaluacion_intento
DROP POLICY IF EXISTS "intento_select" ON public.evaluacion_intento;
CREATE POLICY "intento_select"
  ON public.evaluacion_intento
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuario u
      WHERE u.id_usuario = evaluacion_intento.id_usuario
        AND u.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "intento_insert" ON public.evaluacion_intento;
CREATE POLICY "intento_insert"
  ON public.evaluacion_intento
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.usuario u
      WHERE u.id_usuario = evaluacion_intento.id_usuario
        AND u.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "intento_update" ON public.evaluacion_intento;
CREATE POLICY "intento_update"
  ON public.evaluacion_intento
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuario u
      WHERE u.id_usuario = evaluacion_intento.id_usuario
        AND u.auth_user_id = (select auth.uid())
    )
  );

-- respuesta_evaluacion
DROP POLICY IF EXISTS "respuesta_select" ON public.respuesta_evaluacion;
CREATE POLICY "respuesta_select"
  ON public.respuesta_evaluacion
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.evaluacion_intento ei
      JOIN public.usuario u ON u.id_usuario = ei.id_usuario
      WHERE ei.id_intento = respuesta_evaluacion.id_intento
        AND u.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "respuesta_insert" ON public.respuesta_evaluacion;
CREATE POLICY "respuesta_insert"
  ON public.respuesta_evaluacion
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.evaluacion_intento ei
      JOIN public.usuario u ON u.id_usuario = ei.id_usuario
      WHERE ei.id_intento = respuesta_evaluacion.id_intento
        AND u.auth_user_id = (select auth.uid())
    )
  );

-- evaluacion
DROP POLICY IF EXISTS "evaluacion_select" ON public.evaluacion;
CREATE POLICY "evaluacion_select"
  ON public.evaluacion
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.modulo m
      JOIN public.curso c ON c.id_curso = m.id_curso
      JOIN public.proceso_asignado_curso pac ON pac.id_curso = c.id_curso
      JOIN public.detalle_proceso_curso dpc ON dpc.id_proceso_asignado_curso = pac.id_proceso_asignado_curso
      JOIN public.usuario u ON u.id_usuario = dpc.id_usuario
      WHERE m.id_modulo = evaluacion.id_modulo
        AND u.auth_user_id = (select auth.uid())
    )
  );

-- pregunta
DROP POLICY IF EXISTS "pregunta_select" ON public.pregunta;
CREATE POLICY "pregunta_select"
  ON public.pregunta
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.evaluacion e
      JOIN public.modulo m ON m.id_modulo = e.id_modulo
      JOIN public.curso c ON c.id_curso = m.id_curso
      JOIN public.proceso_asignado_curso pac ON pac.id_curso = c.id_curso
      JOIN public.detalle_proceso_curso dpc ON dpc.id_proceso_asignado_curso = pac.id_proceso_asignado_curso
      JOIN public.usuario u ON u.id_usuario = dpc.id_usuario
      WHERE e.id_evaluacion = pregunta.id_evaluacion
        AND u.auth_user_id = (select auth.uid())
    )
  );

-- tarea: remove redundant permissive SELECT policy (keeps effective behavior via remaining permissive SELECT policy)
DROP POLICY IF EXISTS "Lectura tareas por iglesia" ON public.tarea;
