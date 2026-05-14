-- ============================================================
-- FIX: Remaining tables missing sede→ministerio hierarchy in RLS
--
-- Tables fixed:
--   miembro_ministerio  - SELECT=true security hole; missing admin_sede
--   evento_ministerio   - missing admin_sede scope
--   usuario_rol_sede    - duplicate policies; missing admin_sede visibility
--   sede                - 3x duplicate policies per operation (cleanup)
--   proceso_asignado_curso - SELECT=true security hole
-- ============================================================

-- ── MIEMBRO_MINISTERIO ─────────────────────────────────────
-- Old SELECT=true exposed all ministry members across all iglesias.
-- Old INSERT/UPDATE/DELETE used get_user_iglesias() without admin_sede scope.
DROP POLICY IF EXISTS "Lectura autenticada" ON public.miembro_ministerio;
DROP POLICY IF EXISTS "Scoped insert miembro_ministerio" ON public.miembro_ministerio;
DROP POLICY IF EXISTS "Scoped update miembro_ministerio" ON public.miembro_ministerio;
DROP POLICY IF EXISTS "Scoped delete miembro_ministerio" ON public.miembro_ministerio;
DROP POLICY IF EXISTS miembro_ministerio_select ON public.miembro_ministerio;
DROP POLICY IF EXISTS miembro_ministerio_insert ON public.miembro_ministerio;
DROP POLICY IF EXISTS miembro_ministerio_update ON public.miembro_ministerio;
DROP POLICY IF EXISTS miembro_ministerio_delete ON public.miembro_ministerio;

CREATE POLICY miembro_ministerio_select ON public.miembro_ministerio
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = miembro_ministerio.id_ministerio
          AND s.id_iglesia = get_my_tenant_id()
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

CREATE POLICY miembro_ministerio_insert ON public.miembro_ministerio
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = miembro_ministerio.id_ministerio
          AND s.id_iglesia = get_my_tenant_id()
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

CREATE POLICY miembro_ministerio_update ON public.miembro_ministerio
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = miembro_ministerio.id_ministerio
          AND s.id_iglesia = get_my_tenant_id()
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
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = miembro_ministerio.id_ministerio
          AND s.id_iglesia = get_my_tenant_id()
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

CREATE POLICY miembro_ministerio_delete ON public.miembro_ministerio
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = miembro_ministerio.id_ministerio
          AND s.id_iglesia = get_my_tenant_id()
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.miembro_ministerio TO authenticated;

-- ── EVENTO_MINISTERIO ──────────────────────────────────────
-- Old policies used get_user_ministerios() without admin_sede scope.
DROP POLICY IF EXISTS "EventoMinisterio select" ON public.evento_ministerio;
DROP POLICY IF EXISTS "EventoMinisterio insert gestion" ON public.evento_ministerio;
DROP POLICY IF EXISTS "EventoMinisterio delete gestion" ON public.evento_ministerio;
DROP POLICY IF EXISTS evento_ministerio_select ON public.evento_ministerio;
DROP POLICY IF EXISTS evento_ministerio_insert ON public.evento_ministerio;
DROP POLICY IF EXISTS evento_ministerio_delete ON public.evento_ministerio;

CREATE POLICY evento_ministerio_select ON public.evento_ministerio
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.evento e
        WHERE e.id_evento = evento_ministerio.id_evento
          AND e.id_iglesia = get_my_tenant_id()
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

CREATE POLICY evento_ministerio_insert ON public.evento_ministerio
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.evento e
        WHERE e.id_evento = evento_ministerio.id_evento
          AND e.id_iglesia = get_my_tenant_id()
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

CREATE POLICY evento_ministerio_delete ON public.evento_ministerio
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.evento e
        WHERE e.id_evento = evento_ministerio.id_evento
          AND e.id_iglesia = get_my_tenant_id()
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

GRANT SELECT, INSERT, DELETE ON public.evento_ministerio TO authenticated;

-- ── USUARIO_ROL_SEDE ───────────────────────────────────────
-- Had 7 overlapping policies. admin_sede was missing from SELECT.
-- Only admin_iglesia grants/revokes roles; admin_sede can VIEW their sede's assignments.
DROP POLICY IF EXISTS "UsuarioRolSede delete por tenant" ON public.usuario_rol_sede;
DROP POLICY IF EXISTS "UsuarioRolSede insert por tenant" ON public.usuario_rol_sede;
DROP POLICY IF EXISTS "UsuarioRolSede update por tenant" ON public.usuario_rol_sede;
DROP POLICY IF EXISTS usuario_rol_sede_select ON public.usuario_rol_sede;
DROP POLICY IF EXISTS usuario_rol_sede_insert ON public.usuario_rol_sede;
DROP POLICY IF EXISTS usuario_rol_sede_update ON public.usuario_rol_sede;
DROP POLICY IF EXISTS usuario_rol_sede_delete ON public.usuario_rol_sede;

CREATE POLICY usuario_rol_sede_select ON public.usuario_rol_sede
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
    OR (is_admin_sede() AND id_sede IN (SELECT get_my_sedes()))
  );

CREATE POLICY usuario_rol_sede_insert ON public.usuario_rol_sede
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND id_iglesia = get_my_tenant_id()
      AND EXISTS (
        SELECT 1 FROM public.sede s
        WHERE s.id_sede = usuario_rol_sede.id_sede
          AND s.id_iglesia = get_my_tenant_id()
      )
    )
  );

CREATE POLICY usuario_rol_sede_update ON public.usuario_rol_sede
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
  )
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND id_iglesia = get_my_tenant_id()
      AND EXISTS (
        SELECT 1 FROM public.sede s
        WHERE s.id_sede = usuario_rol_sede.id_sede
          AND s.id_iglesia = get_my_tenant_id()
      )
    )
  );

CREATE POLICY usuario_rol_sede_delete ON public.usuario_rol_sede
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuario_rol_sede TO authenticated;

-- ── SEDE ───────────────────────────────────────────────────
-- Had 3 overlapping policies per operation from different migration layers.
-- Consolidated to 1 clean policy per operation.
DROP POLICY IF EXISTS "Scoped delete sede" ON public.sede;
DROP POLICY IF EXISTS "Scoped insert sede" ON public.sede;
DROP POLICY IF EXISTS "Scoped update sede" ON public.sede;
DROP POLICY IF EXISTS "Sede select por tenant" ON public.sede;
DROP POLICY IF EXISTS sede_delete ON public.sede;
DROP POLICY IF EXISTS sede_delete_admin ON public.sede;
DROP POLICY IF EXISTS sede_insert ON public.sede;
DROP POLICY IF EXISTS sede_mutations_admin ON public.sede;
DROP POLICY IF EXISTS sede_update ON public.sede;
DROP POLICY IF EXISTS sede_update_admin ON public.sede;
DROP POLICY IF EXISTS sede_select_tenant ON public.sede;

CREATE POLICY sede_select ON public.sede
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR id_iglesia = get_my_tenant_id()
  );

CREATE POLICY sede_insert ON public.sede
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
  );

CREATE POLICY sede_update ON public.sede
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
  )
  WITH CHECK (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
  );

CREATE POLICY sede_delete ON public.sede
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sede TO authenticated;

-- ── PROCESO_ASIGNADO_CURSO ────────────────────────────────
-- Old SELECT=true exposed all course enrollments across all iglesias.
DROP POLICY IF EXISTS "Lectura autenticada" ON public.proceso_asignado_curso;
DROP POLICY IF EXISTS proceso_asignado_curso_select_scoped ON public.proceso_asignado_curso;

CREATE POLICY proceso_asignado_curso_select_scoped ON public.proceso_asignado_curso
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR id_iglesia = get_my_tenant_id()
  );
