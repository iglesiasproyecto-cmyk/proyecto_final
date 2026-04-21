-- Revierte lectura de modulo basada en rol global (get_my_highest_role) a scope por curso.
-- Problema previo: get_my_highest_role() permitia leer cualquier modulo si el usuario tenia
-- rol de Lider/Admin en algun ministerio, sin verificar que el curso perteneciera a ese scope.
-- Aqui restablecemos can_manage_curso_scope(id_curso) como la via de gestion, manteniendo
-- can_read_modulo_as_student(id_modulo) como via de lectura para inscritos.

DROP POLICY IF EXISTS "Lectura modulo por gestion o inscripcion" ON public.modulo;

CREATE POLICY "Lectura modulo por gestion o inscripcion"
  ON public.modulo FOR SELECT
  TO authenticated
  USING (
    public.can_manage_curso_scope(id_curso)
    OR public.can_read_modulo_as_student(id_modulo)
  );
