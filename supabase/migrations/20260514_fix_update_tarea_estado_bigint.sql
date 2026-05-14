-- Fix update_tarea_estado_rpc to accept BIGINT instead of INTEGER

CREATE OR REPLACE FUNCTION public.update_tarea_estado_rpc(
  p_id_tarea bigint,
  p_estado text
)
RETURNS public.tarea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.tarea;
  v_actual public.estado_tarea;
  v_ministerio_id bigint;
  v_is_assigned boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;

  SELECT estado, id_ministerio
  INTO v_actual, v_ministerio_id
  FROM public.tarea
  WHERE id_tarea = p_id_tarea;

  IF v_actual IS NULL THEN
    RAISE EXCEPTION 'Tarea not found';
  END IF;

  IF public.is_admin_iglesia() THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.ministerio m
      JOIN public.sede s ON s.id_sede = m.id_sede
      WHERE m.id_ministerio = v_ministerio_id
        AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
    ) THEN
      RAISE EXCEPTION 'Forbidden: task out of scope';
    END IF;
  END IF;

  v_is_assigned := EXISTS (
    SELECT 1
    FROM public.tarea_asignada
    WHERE id_tarea = p_id_tarea
      AND id_usuario = public.current_usuario_id()
  );

  IF NOT (public.is_admin_iglesia() OR public.is_lider() OR v_is_assigned) THEN
    RAISE EXCEPTION 'Forbidden: insufficient permissions';
  END IF;

  UPDATE public.tarea
  SET estado = p_estado::public.estado_tarea
  WHERE id_tarea = p_id_tarea
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_tarea_estado_rpc(bigint, text) TO authenticated;
