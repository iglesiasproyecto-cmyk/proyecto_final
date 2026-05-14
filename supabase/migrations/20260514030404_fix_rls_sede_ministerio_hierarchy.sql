-- ============================================================
-- FIX: Correct sede → ministerio hierarchy in RLS policies
--
-- Hierarchy: Iglesia → Sede → Ministerio
-- - ministerio.id_sede is NOT NULL (ministerio always belongs to a sede)
-- - evento: id_iglesia (required), id_sede (optional), id_ministerio (optional)
-- - tarea: id_iglesia (optional), id_ministerio (optional)
--
-- Roles:
--   super_admin     → full access to everything
--   admin_iglesia   → full access to everything in their iglesia
--   admin_sede      → full access to their sedes and all ministerios in those sedes
--   lider           → access to events/tasks for ministerios they belong to
-- ============================================================

-- ── NEW HELPER: get_my_sedes() ──────────────────────────────
-- Returns sede IDs where the current user is admin_sede
CREATE OR REPLACE FUNCTION public.get_my_sedes()
RETURNS TABLE(id bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT urs.id_sede::bigint
  FROM public.usuario_rol_sede urs
  JOIN public.rol r ON r.id_rol = urs.id_rol
  WHERE urs.id_usuario = get_my_usuario_id()
    AND r.nombre ILIKE '%administrador de sede%'
    AND urs.fecha_fin IS NULL;
END;
$function$;

-- ── EVENTO ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Evento select por alcance" ON public.evento;
DROP POLICY IF EXISTS "Evento insert por gestion" ON public.evento;
DROP POLICY IF EXISTS "Evento update por gestion" ON public.evento;
DROP POLICY IF EXISTS "Evento delete por gestion" ON public.evento;
DROP POLICY IF EXISTS "Authenticated insert evento" ON public.evento;
DROP POLICY IF EXISTS "Authenticated update evento" ON public.evento;
DROP POLICY IF EXISTS "Authenticated delete evento" ON public.evento;
DROP POLICY IF EXISTS evento_select ON public.evento;
DROP POLICY IF EXISTS evento_insert ON public.evento;
DROP POLICY IF EXISTS evento_update ON public.evento;
DROP POLICY IF EXISTS evento_delete ON public.evento;

CREATE POLICY evento_select ON public.evento
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
    OR (
      is_admin_sede()
      AND id_iglesia = get_my_tenant_id()
      AND (
        id_sede IN (SELECT get_my_sedes())
        OR id_ministerio IN (
          SELECT m.id_ministerio FROM public.ministerio m
          WHERE m.id_sede IN (SELECT get_my_sedes())
        )
      )
    )
    OR (is_lider() AND id_ministerio IN (SELECT get_my_ministerios()))
    -- Iglesia-wide events (no sede, no ministerio) visible to all members
    OR (id_iglesia = get_my_tenant_id() AND id_sede IS NULL AND id_ministerio IS NULL)
  );

CREATE POLICY evento_insert ON public.evento
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
    OR (
      is_admin_sede()
      AND id_iglesia = get_my_tenant_id()
      AND (
        id_sede IN (SELECT get_my_sedes())
        OR (
          id_ministerio IS NOT NULL
          AND id_ministerio IN (
            SELECT m.id_ministerio FROM public.ministerio m
            WHERE m.id_sede IN (SELECT get_my_sedes())
          )
        )
      )
    )
    OR (
      is_lider()
      AND id_iglesia = get_my_tenant_id()
      AND id_ministerio IS NOT NULL
      AND id_ministerio IN (SELECT get_my_ministerios())
    )
  );

CREATE POLICY evento_update ON public.evento
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
    OR (
      is_admin_sede()
      AND id_iglesia = get_my_tenant_id()
      AND (
        id_sede IN (SELECT get_my_sedes())
        OR id_ministerio IN (
          SELECT m.id_ministerio FROM public.ministerio m
          WHERE m.id_sede IN (SELECT get_my_sedes())
        )
      )
    )
    OR (is_lider() AND id_ministerio IN (SELECT get_my_ministerios()))
  )
  WITH CHECK (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
    OR (
      is_admin_sede()
      AND id_iglesia = get_my_tenant_id()
      AND (
        id_sede IN (SELECT get_my_sedes())
        OR (
          id_ministerio IS NOT NULL
          AND id_ministerio IN (
            SELECT m.id_ministerio FROM public.ministerio m
            WHERE m.id_sede IN (SELECT get_my_sedes())
          )
        )
      )
    )
    OR (is_lider() AND id_ministerio IN (SELECT get_my_ministerios()))
  );

CREATE POLICY evento_delete ON public.evento
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
    OR (
      is_admin_sede()
      AND id_iglesia = get_my_tenant_id()
      AND (
        id_sede IN (SELECT get_my_sedes())
        OR id_ministerio IN (
          SELECT m.id_ministerio FROM public.ministerio m
          WHERE m.id_sede IN (SELECT get_my_sedes())
        )
      )
    )
    OR (is_lider() AND id_ministerio IN (SELECT get_my_ministerios()))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evento TO authenticated;

-- ── TAREA ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Tarea select por rol" ON public.tarea;
DROP POLICY IF EXISTS "Tarea insert por lider" ON public.tarea;
DROP POLICY IF EXISTS "Tarea update por gestion" ON public.tarea;
DROP POLICY IF EXISTS "Tarea delete por gestion" ON public.tarea;
DROP POLICY IF EXISTS tarea_select ON public.tarea;
DROP POLICY IF EXISTS tarea_insert ON public.tarea;
DROP POLICY IF EXISTS tarea_update ON public.tarea;
DROP POLICY IF EXISTS tarea_delete ON public.tarea;

CREATE POLICY tarea_select ON public.tarea
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR id_usuario_creador = get_my_usuario_id()
    OR (
      is_admin_iglesia()
      AND (
        id_iglesia = get_my_tenant_id()
        OR id_ministerio IN (
          SELECT m.id_ministerio FROM public.ministerio m
          JOIN public.sede s ON s.id_sede = m.id_sede
          WHERE s.id_iglesia = get_my_tenant_id()
        )
      )
    )
    OR (
      is_admin_sede()
      AND id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        WHERE m.id_sede IN (SELECT get_my_sedes())
      )
    )
    OR (is_lider() AND id_ministerio IN (SELECT get_my_ministerios()))
    OR EXISTS (
      SELECT 1 FROM public.tarea_asignada ta
      WHERE ta.id_tarea = tarea.id_tarea AND ta.id_usuario = get_my_usuario_id()
    )
  );

CREATE POLICY tarea_insert ON public.tarea
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND id_usuario_creador = get_my_usuario_id()
      AND (
        id_iglesia = get_my_tenant_id()
        OR id_ministerio IN (
          SELECT m.id_ministerio FROM public.ministerio m
          JOIN public.sede s ON s.id_sede = m.id_sede
          WHERE s.id_iglesia = get_my_tenant_id()
        )
      )
    )
    OR (
      is_admin_sede()
      AND id_usuario_creador = get_my_usuario_id()
      AND id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        WHERE m.id_sede IN (SELECT get_my_sedes())
      )
    )
    OR (
      is_lider()
      AND id_usuario_creador = get_my_usuario_id()
      AND id_ministerio IS NOT NULL
      AND id_ministerio IN (SELECT get_my_ministerios())
    )
  );

CREATE POLICY tarea_update ON public.tarea
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR id_usuario_creador = get_my_usuario_id()
    OR (
      is_admin_iglesia()
      AND (
        id_iglesia = get_my_tenant_id()
        OR id_ministerio IN (
          SELECT m.id_ministerio FROM public.ministerio m
          JOIN public.sede s ON s.id_sede = m.id_sede
          WHERE s.id_iglesia = get_my_tenant_id()
        )
      )
    )
    OR (
      is_admin_sede()
      AND id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        WHERE m.id_sede IN (SELECT get_my_sedes())
      )
    )
    OR (is_lider() AND id_ministerio IN (SELECT get_my_ministerios()))
  )
  WITH CHECK (
    is_super_admin()
    OR id_usuario_creador = get_my_usuario_id()
    OR (
      is_admin_iglesia()
      AND (
        id_iglesia = get_my_tenant_id()
        OR id_ministerio IN (
          SELECT m.id_ministerio FROM public.ministerio m
          JOIN public.sede s ON s.id_sede = m.id_sede
          WHERE s.id_iglesia = get_my_tenant_id()
        )
      )
    )
    OR (
      is_admin_sede()
      AND id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        WHERE m.id_sede IN (SELECT get_my_sedes())
      )
    )
    OR (is_lider() AND id_ministerio IN (SELECT get_my_ministerios()))
  );

CREATE POLICY tarea_delete ON public.tarea
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR id_usuario_creador = get_my_usuario_id()
    OR (
      is_admin_iglesia()
      AND (
        id_iglesia = get_my_tenant_id()
        OR id_ministerio IN (
          SELECT m.id_ministerio FROM public.ministerio m
          JOIN public.sede s ON s.id_sede = m.id_sede
          WHERE s.id_iglesia = get_my_tenant_id()
        )
      )
    )
    OR (
      is_admin_sede()
      AND id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        WHERE m.id_sede IN (SELECT get_my_sedes())
      )
    )
    OR (is_lider() AND id_ministerio IN (SELECT get_my_ministerios()))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarea TO authenticated;

-- ── MINISTERIO ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Lectura ministerios scoped" ON public.ministerio;
DROP POLICY IF EXISTS "Ministerio select por alcance" ON public.ministerio;
DROP POLICY IF EXISTS ministerio_select ON public.ministerio;
DROP POLICY IF EXISTS ministerio_insert ON public.ministerio;
DROP POLICY IF EXISTS ministerio_update ON public.ministerio;
DROP POLICY IF EXISTS ministerio_delete ON public.ministerio;

CREATE POLICY ministerio_select ON public.ministerio
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.sede s
        WHERE s.id_sede = ministerio.id_sede
          AND s.id_iglesia = get_my_tenant_id()
      )
    )
    OR id_sede IN (SELECT get_my_sedes())
    OR id_ministerio IN (SELECT get_my_ministerios())
  );

CREATE POLICY ministerio_insert ON public.ministerio
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.sede s
        WHERE s.id_sede = ministerio.id_sede
          AND s.id_iglesia = get_my_tenant_id()
      )
    )
    OR id_sede IN (SELECT get_my_sedes())
  );

CREATE POLICY ministerio_update ON public.ministerio
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.sede s
        WHERE s.id_sede = ministerio.id_sede
          AND s.id_iglesia = get_my_tenant_id()
      )
    )
    OR id_sede IN (SELECT get_my_sedes())
  )
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.sede s
        WHERE s.id_sede = ministerio.id_sede
          AND s.id_iglesia = get_my_tenant_id()
      )
    )
    OR id_sede IN (SELECT get_my_sedes())
  );

CREATE POLICY ministerio_delete ON public.ministerio
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.sede s
        WHERE s.id_sede = ministerio.id_sede
          AND s.id_iglesia = get_my_tenant_id()
      )
    )
    OR id_sede IN (SELECT get_my_sedes())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ministerio TO authenticated;
