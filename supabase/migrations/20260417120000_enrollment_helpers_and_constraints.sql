-- Sub-proyecto A: helpers de autorización, unicidad parcial y trigger de reactivación.
-- Depende de: is_super_admin, is_admin_of_iglesia (phaseA), get_user_ministerios (fix_ministerio_rls_lideres).

-- ---------------------------------------------------------------------------
-- Helper: id_usuario del llamante autenticado.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_usuario_id()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id_usuario FROM public.usuario WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_usuario_id() TO authenticated;

-- ---------------------------------------------------------------------------
-- Helper: es líder del ministerio target?
-- Usa get_user_ministerios() que ya existe (migración 20260416140000).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_lider_of_ministerio(target_ministerio_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT target_ministerio_id IN (SELECT public.get_user_ministerios());
$$;

GRANT EXECUTE ON FUNCTION public.is_lider_of_ministerio(bigint) TO authenticated;

-- ---------------------------------------------------------------------------
-- Helper: caller puede inscribir/retirar en el ciclo dado?
-- super_admin, admin_iglesia de la iglesia del ciclo, o líder del ministerio del curso.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_enroll_in_ciclo(target_ciclo_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.proceso_asignado_curso pac
    JOIN public.curso c ON c.id_curso = pac.id_curso
    WHERE pac.id_proceso_asignado_curso = target_ciclo_id
      AND (
        public.is_super_admin()
        OR public.is_admin_of_iglesia(pac.id_iglesia)
        OR public.is_lider_of_ministerio(c.id_ministerio)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_enroll_in_ciclo(bigint) TO authenticated;

-- ---------------------------------------------------------------------------
-- Partial unique index: evita dos inscripciones activas del mismo (usuario, ciclo).
-- La unicidad por (usuario, curso) a través de ciclos distintos se valida en el RPC.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS detalle_proceso_curso_activo_por_ciclo
  ON public.detalle_proceso_curso (id_usuario, id_proceso_asignado_curso)
  WHERE estado IN ('inscrito','en_progreso');

-- ---------------------------------------------------------------------------
-- CHECK de fechas coherentes en el ciclo.
-- ---------------------------------------------------------------------------
ALTER TABLE public.proceso_asignado_curso
  DROP CONSTRAINT IF EXISTS proceso_asignado_curso_fechas_ok;

ALTER TABLE public.proceso_asignado_curso
  ADD CONSTRAINT proceso_asignado_curso_fechas_ok
  CHECK (fecha_inicio <= fecha_fin);

-- ---------------------------------------------------------------------------
-- Trigger: al reactivar (retirado → inscrito), bloquear si el usuario tiene
-- otra inscripción activa del mismo curso en otro ciclo.
-- ---------------------------------------------------------------------------
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
     AND COALESCE(OLD.estado, '') NOT IN ('inscrito','en_progreso') THEN
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

DROP TRIGGER IF EXISTS detalle_block_reactivar_if_duplicate ON public.detalle_proceso_curso;
CREATE TRIGGER detalle_block_reactivar_if_duplicate
  BEFORE UPDATE ON public.detalle_proceso_curso
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_detalle_block_reactivar_if_duplicate();
