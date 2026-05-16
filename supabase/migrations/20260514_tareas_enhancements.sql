-- ── Tarea Table Enhancements ──

ALTER TABLE tarea ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_tarea_archived_at ON tarea(archived_at);

-- ── RPC: Bulk Update Task Estado ──

CREATE OR REPLACE FUNCTION bulk_update_tarea_estado(
  p_tarea_ids BIGINT[],
  p_nuevo_estado VARCHAR
)
RETURNS TABLE(id_tarea BIGINT, estado VARCHAR, success BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check permissions: super_admin OR admin_iglesia
  IF NOT (is_super_admin() OR is_admin_iglesia()) THEN
    RAISE EXCEPTION 'Only super_admin or admin_iglesia can bulk update tasks';
  END IF;

  -- Update all tasks and return results
  RETURN QUERY
  UPDATE tarea
  SET estado = p_nuevo_estado, updated_at = NOW()
  WHERE id_tarea = ANY(p_tarea_ids)
  RETURNING tarea.id_tarea, tarea.estado::VARCHAR, TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_update_tarea_estado(BIGINT[], VARCHAR) TO authenticated;

-- ── RPC: Archive Task ──

CREATE OR REPLACE FUNCTION archive_tarea(p_id_tarea BIGINT)
RETURNS tarea
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result tarea;
BEGIN
  -- Check permissions: super_admin OR admin_iglesia
  IF NOT (is_super_admin() OR is_admin_iglesia()) THEN
    RAISE EXCEPTION 'Only super_admin or admin_iglesia can archive tasks';
  END IF;

  -- Update tarea and return
  UPDATE tarea
  SET archived_at = NOW(), updated_at = NOW()
  WHERE id_tarea = p_id_tarea
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION archive_tarea(BIGINT) TO authenticated;

-- ── RPC: Unarchive Task ──

CREATE OR REPLACE FUNCTION unarchive_tarea(p_id_tarea BIGINT)
RETURNS tarea
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result tarea;
BEGIN
  -- Check permissions: super_admin OR admin_iglesia
  IF NOT (is_super_admin() OR is_admin_iglesia()) THEN
    RAISE EXCEPTION 'Only super_admin or admin_iglesia can unarchive tasks';
  END IF;

  -- Update tarea and return
  UPDATE tarea
  SET archived_at = NULL, updated_at = NOW()
  WHERE id_tarea = p_id_tarea
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION unarchive_tarea(BIGINT) TO authenticated;
