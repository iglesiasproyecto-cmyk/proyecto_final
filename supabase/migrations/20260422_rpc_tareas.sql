-- ============================================================================
-- RPC functions for tarea CRUD with SECURITY DEFINER to bypass RLS issues
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_tarea(
  p_titulo text,
  p_descripcion text DEFAULT NULL,
  p_fecha_limite date DEFAULT NULL,
  p_prioridad text DEFAULT 'media',
  p_id_usuario_creador integer DEFAULT NULL
)
RETURNS public.tarea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.tarea;
  v_auth_user_id uuid;
  v_usuario_id integer;
BEGIN
  -- Verify caller is authenticated
  v_auth_user_id := auth.uid();
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;

  -- Resolve usuario id from auth user if not provided
  IF p_id_usuario_creador IS NULL THEN
    SELECT id_usuario INTO v_usuario_id
    FROM public.usuario
    WHERE auth_user_id = v_auth_user_id
    LIMIT 1;
    IF v_usuario_id IS NULL THEN
      RAISE EXCEPTION 'Usuario not found for auth user %', v_auth_user_id;
    END IF;
  ELSE
    v_usuario_id := p_id_usuario_creador;
  END IF;

  -- Insert the task
  INSERT INTO public.tarea (
    titulo,
    descripcion,
    fecha_limite,
    estado,
    prioridad,
    id_usuario_creador
  ) VALUES (
    p_titulo,
    p_descripcion,
    p_fecha_limite,
    'pendiente',
    p_prioridad::public.prioridad_tarea,
    v_usuario_id
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_tarea(text, text, date, text, integer) TO authenticated;

-- ============================================================================
-- RPC function to update tarea estado
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_tarea_estado_rpc(
  p_id_tarea integer,
  p_estado text
)
RETURNS public.tarea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.tarea;
  v_auth_user_id uuid;
BEGIN
  v_auth_user_id := auth.uid();
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;

  UPDATE public.tarea
  SET estado = p_estado::public.estado_tarea
  WHERE id_tarea = p_id_tarea
  RETURNING * INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Tarea not found';
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_tarea_estado_rpc(integer, text) TO authenticated;

-- ============================================================================
-- RPC function to delete tarea
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_tarea_rpc(
  p_id_tarea integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;

  DELETE FROM public.tarea WHERE id_tarea = p_id_tarea;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_tarea_rpc(integer) TO authenticated;

