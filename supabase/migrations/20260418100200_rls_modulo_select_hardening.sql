-- Endurece SELECT en modulo: reemplaza lectura abierta por lectura por rol de gestion o estudiante inscrito.

DROP POLICY IF EXISTS "Lectura autenticada" ON public.modulo;
DROP POLICY IF EXISTS "Lectura modulo por gestion o inscripcion" ON public.modulo;

CREATE POLICY "Lectura modulo por gestion o inscripcion"
  ON public.modulo FOR SELECT
  TO authenticated
  USING (
    public.get_my_highest_role() = ANY (
      ARRAY['Super Administrador'::text, 'Administrador de Iglesia'::text, 'Líder'::text]
    )
    OR public.can_read_modulo_as_student(id_modulo)
  );
