-- Helper: verifica si el usuario autenticado puede leer el modulo como estudiante inscrito.
CREATE OR REPLACE FUNCTION public.can_read_modulo_as_student(p_id_modulo bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.modulo m
    JOIN public.curso c ON c.id_curso = m.id_curso
    JOIN public.proceso_asignado_curso p ON p.id_curso = c.id_curso
    JOIN public.detalle_proceso_curso d ON d.id_proceso_asignado_curso = p.id_proceso_asignado_curso
    WHERE m.id_modulo = p_id_modulo
      AND m.estado = 'publicado'
      AND c.estado = 'activo'
      AND d.id_usuario = public.current_usuario_id()
      AND d.estado IN ('inscrito', 'en_progreso')
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_read_modulo_as_student(bigint) TO authenticated;

-- Policy permisiva adicional para estudiantes inscritos.
DROP POLICY IF EXISTS "Servidor inscrito puede leer módulos publicados" ON public.modulo;

CREATE POLICY "Servidor inscrito puede leer módulos publicados"
  ON public.modulo FOR SELECT
  TO authenticated
  USING (public.can_read_modulo_as_student(id_modulo));
