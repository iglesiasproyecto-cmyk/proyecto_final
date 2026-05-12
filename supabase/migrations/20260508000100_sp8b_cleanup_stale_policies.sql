-- SP-8b: Drop ALL stale over-permissive and conflicting policies.
--         Keeps only the canonical tenant-scoped policies from SP-8.

-- ══════════════════════════════════════════════════════════════════════════════
-- USUARIO — drop stale SELECT policies (some expose all users to everyone)
-- ══════════════════════════════════════════════════════════════════════════════
-- "usuario_select_authenticated" USING (activo = true AND deleted_at IS NULL)
-- exposes ALL active users to any authenticated user — data leak.
DROP POLICY IF EXISTS "usuario_select_authenticated" ON public.usuario;
DROP POLICY IF EXISTS "usuario_select_self"          ON public.usuario;
DROP POLICY IF EXISTS "usuario_select_super_admin"   ON public.usuario;
-- canonical SELECT is "usuario_select_tenant" (from SP-8)

-- ══════════════════════════════════════════════════════════════════════════════
-- MINISTERIO — drop every policy not from SP-8
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_sede_delete_ministerio"     ON public.ministerio;
DROP POLICY IF EXISTS "admin_sede_insert_ministerio"     ON public.ministerio;
DROP POLICY IF EXISTS "admin_sede_select_ministerio"     ON public.ministerio;
DROP POLICY IF EXISTS "admin_sede_update_ministerio"     ON public.ministerio;
DROP POLICY IF EXISTS "lider_select_ministerio"          ON public.ministerio;
DROP POLICY IF EXISTS "ministerio delete"                ON public.ministerio;
DROP POLICY IF EXISTS "ministerio insert"                ON public.ministerio;
DROP POLICY IF EXISTS "ministerio select"                ON public.ministerio;
DROP POLICY IF EXISTS "ministerio update"                ON public.ministerio;
DROP POLICY IF EXISTS "ministerio_delete_admin_iglesia"  ON public.ministerio;
DROP POLICY IF EXISTS "ministerio_insert_admin_iglesia"  ON public.ministerio;
-- "ministerio_select_authenticated" USING (deleted_at IS NULL)
-- exposes ALL ministerios to any authenticated user — data leak.
DROP POLICY IF EXISTS "ministerio_select_authenticated"  ON public.ministerio;
DROP POLICY IF EXISTS "ministerio_select_super_admin"    ON public.ministerio;
DROP POLICY IF EXISTS "ministerio_update_admin_iglesia"  ON public.ministerio;
-- canonical policies: ministerio_select_tenant, ministerio_insert_admin,
--                     ministerio_update_admin_lider, ministerio_delete_admin (from SP-8)

-- ══════════════════════════════════════════════════════════════════════════════
-- USUARIO_ROL_SEDE — drop stale policies (one USING(true) exposes everything)
-- ══════════════════════════════════════════════════════════════════════════════
-- Old set using get_user_iglesias() (plpgsql SECURITY DEFINER — safe but redundant)
-- SKIP: -- SKIPPED (table doesnt exist yet): DROP POLICY IF EXISTS "admin_iglesia_delete_usuario_rol_sede" ON public.usuario_rol_sede;
-- SKIP: -- SKIPPED (table doesnt exist yet): DROP POLICY IF EXISTS "admin_iglesia_insert_usuario_rol_sede" ON public.usuario_rol_sede;
-- SKIP: -- SKIPPED (table doesnt exist yet): DROP POLICY IF EXISTS "admin_iglesia_select_usuario_rol_sede" ON public.usuario_rol_sede;
-- SKIP: -- SKIPPED (table doesnt exist yet): DROP POLICY IF EXISTS "admin_iglesia_update_usuario_rol_sede" ON public.usuario_rol_sede;
-- Old admin_sede policy using unknown functions
-- SKIP: -- SKIPPED (table doesnt exist yet): DROP POLICY IF EXISTS "admin_sede_select_usuario_rol_sede"    ON public.usuario_rol_sede;
-- Old super_admin split policies (covered by SP-8 combined policies)
-- SKIP: -- SKIPPED (table doesnt exist yet): DROP POLICY IF EXISTS "super_admin_delete_usuario_rol_sede"   ON public.usuario_rol_sede;
-- SKIP: -- SKIPPED (table doesnt exist yet): DROP POLICY IF EXISTS "super_admin_insert_usuario_rol_sede"   ON public.usuario_rol_sede;
-- SKIP: -- SKIPPED (table doesnt exist yet): DROP POLICY IF EXISTS "super_admin_select_usuario_rol_sede"   ON public.usuario_rol_sede;
-- SKIP: -- SKIPPED (table doesnt exist yet): DROP POLICY IF EXISTS "super_admin_update_usuario_rol_sede"   ON public.usuario_rol_sede;
-- Duplicate/redundant super_admin split
-- SKIP: -- SKIPPED (table doesnt exist yet): DROP POLICY IF EXISTS "usuario_rol_sede_delete_super_admin"   ON public.usuario_rol_sede;
-- SKIP: -- SKIPPED (table doesnt exist yet): DROP POLICY IF EXISTS "usuario_rol_sede_insert_super_admin"   ON public.usuario_rol_sede;
-- SKIP: -- "usuario_rol_sede_select_authenticated" USING(true) — exposes everything!
-- SKIP: -- SKIPPED (table doesnt exist yet): DROP POLICY IF EXISTS "usuario_rol_sede_select_authenticated" ON public.usuario_rol_sede;
-- SKIP: -- SKIPPED (table doesnt exist yet): DROP POLICY IF EXISTS "usuario_rol_sede_select_super_admin"   ON public.usuario_rol_sede;
-- SKIP: -- SKIPPED (table doesnt exist yet): DROP POLICY IF EXISTS "usuario_rol_sede_update_super_admin"   ON public.usuario_rol_sede;
-- canonical policies from SP-8:
-- SKIP: --   usuario_rol_sede_select, usuario_rol_sede_insert,
-- SKIP: --   usuario_rol_sede_update, usuario_rol_sede_delete

-- ══════════════════════════════════════════════════════════════════════════════
-- NOTIFICACION / TAREA_ASIGNADA — stale open-SELECT policies from early migrations
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Usuario ve sus notificaciones"  ON public.notificacion;
DROP POLICY IF EXISTS "Usuario ve sus tareas asignadas" ON public.tarea_asignada;
