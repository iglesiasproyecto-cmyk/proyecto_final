-- Elimina auto-referencia recursiva en policy SELECT de detalle_proceso_curso.

DROP POLICY IF EXISTS "Select own or manageable detalle_proceso_curso" ON public.detalle_proceso_curso;

CREATE POLICY "Select own or manageable detalle_proceso_curso"
  ON public.detalle_proceso_curso FOR SELECT
  TO authenticated
  USING (
    id_usuario = public.current_usuario_id()
    OR public.can_enroll_in_ciclo(id_proceso_asignado_curso)
    OR public.can_read_proceso_as_student(id_proceso_asignado_curso)
  );
