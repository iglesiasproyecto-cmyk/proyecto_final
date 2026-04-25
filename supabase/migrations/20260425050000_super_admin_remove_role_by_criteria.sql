-- Función RPC para quitar roles por criterios (para Super Admin)
CREATE OR REPLACE FUNCTION public.remove_rol_by_criteria(
  target_usuario_id bigint,
  target_rol_id bigint,
  target_iglesia_id bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rol_record RECORD;
BEGIN
  -- Verificar que el caller es Super Admin
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Solo Super Admin puede usar esta función';
  END IF;

  -- Buscar el rol específico
  SELECT * INTO rol_record
  FROM usuario_rol
  WHERE id_usuario = target_usuario_id
    AND id_rol = target_rol_id
    AND id_iglesia = target_iglesia_id
    AND fecha_fin IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Marcar como finalizado (soft delete)
  UPDATE usuario_rol
  SET fecha_fin = CURRENT_DATE,
      updated_at = NOW()
  WHERE id_usuario_rol = rol_record.id_usuario_rol;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_rol_by_criteria(bigint, bigint, bigint) TO authenticated;