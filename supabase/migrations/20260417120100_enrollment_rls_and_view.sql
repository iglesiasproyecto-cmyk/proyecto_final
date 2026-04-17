-- Sub-proyecto A: reemplazo de policies de detalle_proceso_curso
-- + vista v_companeros_ciclo con security_invoker para respetar RLS del invocador.
-- Depende de la migración 20260417120000 (can_enroll_in_ciclo, current_usuario_id).

-- ---------------------------------------------------------------------------
-- Policies de detalle_proceso_curso
-- Se eliminan las policies "Scoped *" de la Fase B porque eran admin-only;
-- las nuevas usan can_enroll_in_ciclo (incluye al líder del ministerio).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Scoped insert detalle_proceso_curso" ON public.detalle_proceso_curso;
DROP POLICY IF EXISTS "Scoped update detalle_proceso_curso" ON public.detalle_proceso_curso;
DROP POLICY IF EXISTS "Scoped delete detalle_proceso_curso" ON public.detalle_proceso_curso;
DROP POLICY IF EXISTS "Enroll insert detalle_proceso_curso" ON public.detalle_proceso_curso;
DROP POLICY IF EXISTS "Enroll update detalle_proceso_curso" ON public.detalle_proceso_curso;
DROP POLICY IF EXISTS "Enroll delete detalle_proceso_curso" ON public.detalle_proceso_curso;
DROP POLICY IF EXISTS "Select own or manageable detalle_proceso_curso" ON public.detalle_proceso_curso;

CREATE POLICY "Enroll insert detalle_proceso_curso"
  ON public.detalle_proceso_curso FOR INSERT
  TO authenticated
  WITH CHECK (public.can_enroll_in_ciclo(id_proceso_asignado_curso));

CREATE POLICY "Enroll update detalle_proceso_curso"
  ON public.detalle_proceso_curso FOR UPDATE
  TO authenticated
  USING (public.can_enroll_in_ciclo(id_proceso_asignado_curso))
  WITH CHECK (public.can_enroll_in_ciclo(id_proceso_asignado_curso));

CREATE POLICY "Enroll delete detalle_proceso_curso"
  ON public.detalle_proceso_curso FOR DELETE
  TO authenticated
  USING (public.can_enroll_in_ciclo(id_proceso_asignado_curso));

CREATE POLICY "Select own or manageable detalle_proceso_curso"
  ON public.detalle_proceso_curso FOR SELECT
  TO authenticated
  USING (
    id_usuario = public.current_usuario_id()
    OR public.can_enroll_in_ciclo(id_proceso_asignado_curso)
    OR EXISTS (
      SELECT 1 FROM public.detalle_proceso_curso self
      WHERE self.id_proceso_asignado_curso = detalle_proceso_curso.id_proceso_asignado_curso
        AND self.id_usuario = public.current_usuario_id()
        AND self.estado IN ('inscrito','en_progreso','completado')
    )
  );

-- ---------------------------------------------------------------------------
-- Vista v_companeros_ciclo (solo nombres, sin correos).
-- security_invoker=true es crítico: sin él la vista corre como owner (postgres)
-- y bypassa la RLS de detalle_proceso_curso y usuario.
-- ---------------------------------------------------------------------------

DROP VIEW IF EXISTS public.v_companeros_ciclo;

CREATE VIEW public.v_companeros_ciclo
WITH (security_invoker = true) AS
SELECT
  dpc.id_detalle_proceso_curso,
  dpc.id_proceso_asignado_curso,
  dpc.id_usuario,
  dpc.estado,
  u.nombres,
  u.apellidos
FROM public.detalle_proceso_curso dpc
JOIN public.usuario u ON u.id_usuario = dpc.id_usuario
WHERE dpc.estado IN ('inscrito','en_progreso','completado');

GRANT SELECT ON public.v_companeros_ciclo TO authenticated;
