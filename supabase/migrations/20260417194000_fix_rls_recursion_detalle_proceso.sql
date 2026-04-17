-- Evita recursion infinita entre policies de proceso_asignado_curso y detalle_proceso_curso.
-- La policy de lectura de proceso no debe consultar detalle directamente.

CREATE OR REPLACE FUNCTION public.can_read_proceso_as_student(target_ciclo_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.detalle_proceso_curso d
    WHERE d.id_proceso_asignado_curso = target_ciclo_id
      AND d.id_usuario = public.current_usuario_id()
      AND d.estado IN ('inscrito', 'en_progreso', 'completado')
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_read_proceso_as_student(bigint) TO authenticated;

DROP POLICY IF EXISTS "Lectura proceso por gestion o inscripcion" ON public.proceso_asignado_curso;

CREATE POLICY "Lectura proceso por gestion o inscripcion"
  ON public.proceso_asignado_curso FOR SELECT
  TO authenticated
  USING (
    public.can_manage_curso_scope(id_curso)
    OR public.can_read_proceso_as_student(id_proceso_asignado_curso)
  );
