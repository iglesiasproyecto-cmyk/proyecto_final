-- Fix: evitar COALESCE de enum estado_detalle con string vacio en trigger.

CREATE OR REPLACE FUNCTION public.tg_detalle_block_reactivar_if_duplicate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_curso bigint;
  v_conflict_ciclo bigint;
BEGIN
  IF NEW.estado IN ('inscrito','en_progreso')
     AND OLD.estado NOT IN ('inscrito','en_progreso') THEN
    SELECT pac.id_curso INTO v_id_curso
    FROM public.proceso_asignado_curso pac
    WHERE pac.id_proceso_asignado_curso = NEW.id_proceso_asignado_curso;

    SELECT pac.id_proceso_asignado_curso INTO v_conflict_ciclo
    FROM public.detalle_proceso_curso dpc
    JOIN public.proceso_asignado_curso pac
      ON pac.id_proceso_asignado_curso = dpc.id_proceso_asignado_curso
    WHERE dpc.id_usuario = NEW.id_usuario
      AND dpc.id_detalle_proceso_curso <> NEW.id_detalle_proceso_curso
      AND dpc.estado IN ('inscrito','en_progreso')
      AND pac.id_curso = v_id_curso
    LIMIT 1;

    IF v_conflict_ciclo IS NOT NULL THEN
      RAISE EXCEPTION
        'El usuario ya tiene una inscripción activa del mismo curso en el ciclo %',
        v_conflict_ciclo
        USING HINT = 'Retira al usuario de la inscripción activa antes de reactivar esta.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
