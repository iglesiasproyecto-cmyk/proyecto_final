-- Fix robusto: normaliza tipos devueltos por get_enrollment_candidates.
-- Evita errores "structure of query does not match function result type"
-- cuando columnas base usan tipos como citext/varchar/integer.

CREATE OR REPLACE FUNCTION public.get_enrollment_candidates(
  p_ciclo_id bigint,
  p_override_ministerio boolean DEFAULT false
)
RETURNS TABLE (
  id_usuario bigint,
  nombres text,
  apellidos text,
  correo text,
  ministerio_principal text,
  ya_inscrito_activo_en_curso boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_id_curso bigint;
  v_id_iglesia bigint;
  v_id_ministerio bigint;
BEGIN
  IF NOT public.can_enroll_in_ciclo(p_ciclo_id) THEN
    RAISE EXCEPTION 'No autorizado para listar candidatos del ciclo %', p_ciclo_id
      USING ERRCODE = '42501';
  END IF;

  IF p_override_ministerio
     AND NOT (
       public.is_super_admin()
       OR public.is_admin_of_iglesia(
         (SELECT id_iglesia FROM public.proceso_asignado_curso WHERE id_proceso_asignado_curso = p_ciclo_id)
       )
     ) THEN
    RAISE EXCEPTION 'Override restringido a super_admin o admin_iglesia' USING ERRCODE = '42501';
  END IF;

  SELECT pac.id_curso, pac.id_iglesia, c.id_ministerio
    INTO v_id_curso, v_id_iglesia, v_id_ministerio
  FROM public.proceso_asignado_curso pac
  JOIN public.curso c ON c.id_curso = pac.id_curso
  WHERE pac.id_proceso_asignado_curso = p_ciclo_id;

  IF v_id_curso IS NULL THEN
    RAISE EXCEPTION 'Ciclo % no encontrado', p_ciclo_id USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  WITH candidatos AS (
    SELECT DISTINCT u.id_usuario, u.nombres, u.apellidos, u.correo
    FROM public.usuario u
    WHERE CASE
      WHEN p_override_ministerio THEN
        EXISTS (
          SELECT 1
          FROM public.usuario_rol ur
          WHERE ur.id_usuario = u.id_usuario
            AND ur.id_iglesia = v_id_iglesia
            AND (ur.fecha_fin IS NULL OR ur.fecha_fin >= CURRENT_DATE)
        )
      ELSE
        EXISTS (
          SELECT 1
          FROM public.miembro_ministerio mm
          WHERE mm.id_usuario = u.id_usuario
            AND mm.id_ministerio = v_id_ministerio
            AND mm.fecha_salida IS NULL
        )
    END
  )
  SELECT
    c.id_usuario::bigint,
    c.nombres::text,
    c.apellidos::text,
    c.correo::text,
    COALESCE((
      SELECT m.nombre::text
      FROM public.miembro_ministerio mm
      JOIN public.ministerio m ON m.id_ministerio = mm.id_ministerio
      WHERE mm.id_usuario = c.id_usuario
        AND mm.fecha_salida IS NULL
      ORDER BY mm.creado_en ASC
      LIMIT 1
    ), ''::text) AS ministerio_principal,
    EXISTS (
      SELECT 1
      FROM public.detalle_proceso_curso dpc
      JOIN public.proceso_asignado_curso pac2 ON pac2.id_proceso_asignado_curso = dpc.id_proceso_asignado_curso
      WHERE dpc.id_usuario = c.id_usuario
        AND dpc.estado IN ('inscrito', 'en_progreso')
        AND pac2.id_curso = v_id_curso
    )::boolean AS ya_inscrito_activo_en_curso
  FROM candidatos c
  ORDER BY c.apellidos, c.nombres;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_enrollment_candidates(bigint, boolean) TO authenticated;
