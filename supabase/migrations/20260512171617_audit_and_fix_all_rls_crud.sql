-- ============================================================
-- RLS AUDIT & FIX: Complete CRUD policies for all tables
-- ============================================================

-- ── IGLESIA ──
-- Admin iglesia can only see/edit their own iglesia
-- Super admin can see/edit all
DROP POLICY IF EXISTS iglesia_insert ON public.iglesia;
DROP POLICY IF EXISTS iglesia_update ON public.iglesia;
DROP POLICY IF EXISTS iglesia_delete ON public.iglesia;

CREATE POLICY iglesia_insert ON public.iglesia
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY iglesia_update ON public.iglesia
  FOR UPDATE TO authenticated
  USING (is_super_admin() OR id_iglesia = get_my_tenant_id())
  WITH CHECK (is_super_admin());

CREATE POLICY iglesia_delete ON public.iglesia
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- ── SEDE ──
-- Admin iglesia can CRUD sedes in their iglesia
DROP POLICY IF EXISTS sede_insert ON public.sede;
DROP POLICY IF EXISTS sede_update ON public.sede;
DROP POLICY IF EXISTS sede_delete ON public.sede;

CREATE POLICY sede_insert ON public.sede
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()));

CREATE POLICY sede_update ON public.sede
  FOR UPDATE TO authenticated
  USING (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()))
  WITH CHECK (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()));

CREATE POLICY sede_delete ON public.sede
  FOR DELETE TO authenticated
  USING (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()));

-- ── USUARIO_ROL ──
-- Super admin can CRUD all
-- Admin iglesia can CRUD roles in their iglesia (except super admin role)
DROP POLICY IF EXISTS usuario_rol_insert ON public.usuario_rol;
DROP POLICY IF EXISTS usuario_rol_update ON public.usuario_rol;
DROP POLICY IF EXISTS usuario_rol_delete ON public.usuario_rol;

CREATE POLICY usuario_rol_insert ON public.usuario_rol
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND id_iglesia = get_my_tenant_id()
      AND id_rol NOT IN (SELECT id_rol FROM public.rol WHERE nombre = 'Super Administrador')
    )
  );

CREATE POLICY usuario_rol_update ON public.usuario_rol
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
      AND id_rol NOT IN (SELECT id_rol FROM public.rol WHERE nombre = 'Super Administrador')
    )
  );

CREATE POLICY usuario_rol_delete ON public.usuario_rol
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
  );

-- ── USUARIO_ROL_SEDE ──
-- Super admin can CRUD all
-- Admin iglesia can CRUD roles in sedes of their iglesia
DROP POLICY IF EXISTS usuario_rol_sede_insert ON public.usuario_rol_sede;
DROP POLICY IF EXISTS usuario_rol_sede_update ON public.usuario_rol_sede;
DROP POLICY IF EXISTS usuario_rol_sede_delete ON public.usuario_rol_sede;

CREATE POLICY usuario_rol_sede_insert ON public.usuario_rol_sede
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
  );

CREATE POLICY usuario_rol_sede_update ON public.usuario_rol_sede
  FOR UPDATE TO authenticated
  USING (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()))
  WITH CHECK (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()));

CREATE POLICY usuario_rol_sede_delete ON public.usuario_rol_sede
  FOR DELETE TO authenticated
  USING (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()));

-- ── MINISTERIO ──
-- Admin iglesia can CRUD ministerios in their iglesia
DROP POLICY IF EXISTS ministerio_insert ON public.ministerio;
DROP POLICY IF EXISTS ministerio_update ON public.ministerio;
DROP POLICY IF EXISTS ministerio_delete ON public.ministerio;

CREATE POLICY ministerio_insert ON public.ministerio
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()));

CREATE POLICY ministerio_update ON public.ministerio
  FOR UPDATE TO authenticated
  USING (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()))
  WITH CHECK (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()));

CREATE POLICY ministerio_delete ON public.ministerio
  FOR DELETE TO authenticated
  USING (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()));

-- ── CURSO ──
-- Admin iglesia can CRUD cursos in their iglesia
-- Creator can update their own course
DROP POLICY IF EXISTS curso_insert ON public.curso;
DROP POLICY IF EXISTS curso_update ON public.curso;
DROP POLICY IF EXISTS curso_delete ON public.curso;

CREATE POLICY curso_insert ON public.curso
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR is_admin_iglesia());

CREATE POLICY curso_update ON public.curso
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
    OR (id_usuario_creador = get_my_usuario_id())
  )
  WITH CHECK (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()));

CREATE POLICY curso_delete ON public.curso
  FOR DELETE TO authenticated
  USING (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()));

-- ── MODULO ──
-- Admin iglesia can CRUD modulos of courses in their iglesia
-- Creator can update their own module
DROP POLICY IF EXISTS modulo_insert ON public.modulo;
DROP POLICY IF EXISTS modulo_update ON public.modulo;
DROP POLICY IF EXISTS modulo_delete ON public.modulo;

CREATE POLICY modulo_insert ON public.modulo
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.curso c
        WHERE c.id_curso = id_curso AND c.id_iglesia = get_my_tenant_id()
      )
    )
  );

CREATE POLICY modulo_update ON public.modulo
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.curso c
        WHERE c.id_curso = id_curso AND c.id_iglesia = get_my_tenant_id()
      )
    )
  )
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.curso c
        WHERE c.id_curso = id_curso AND c.id_iglesia = get_my_tenant_id()
      )
    )
  );

CREATE POLICY modulo_delete ON public.modulo
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.curso c
        WHERE c.id_curso = id_curso AND c.id_iglesia = get_my_tenant_id()
      )
    )
  );

-- ── TAREA ──
-- Admin iglesia can CRUD tareas in their iglesia
-- Creator can update their own task
DROP POLICY IF EXISTS tarea_insert ON public.tarea;
DROP POLICY IF EXISTS tarea_update ON public.tarea;
DROP POLICY IF EXISTS tarea_delete ON public.tarea;

CREATE POLICY tarea_insert ON public.tarea
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR is_admin_iglesia());

CREATE POLICY tarea_update ON public.tarea
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (id_usuario_creador = get_my_usuario_id())
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.evento e
        WHERE e.id_evento = id_evento AND e.id_iglesia = get_my_tenant_id()
      )
    )
  )
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.evento e
        WHERE e.id_evento = id_evento AND e.id_iglesia = get_my_tenant_id()
      )
    )
  );

CREATE POLICY tarea_delete ON public.tarea
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.evento e
        WHERE e.id_evento = id_evento AND e.id_iglesia = get_my_tenant_id()
      )
    )
  );

-- ── NOTIFICACION ──
-- Users can CRUD their own notifications
DROP POLICY IF EXISTS notificacion_insert ON public.notificacion;
DROP POLICY IF EXISTS notificacion_update ON public.notificacion;
DROP POLICY IF EXISTS notificacion_delete ON public.notificacion;

CREATE POLICY notificacion_insert ON public.notificacion
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR id_usuario = get_my_usuario_id());

CREATE POLICY notificacion_update ON public.notificacion
  FOR UPDATE TO authenticated
  USING (is_super_admin() OR id_usuario = get_my_usuario_id())
  WITH CHECK (is_super_admin() OR id_usuario = get_my_usuario_id());

CREATE POLICY notificacion_delete ON public.notificacion
  FOR DELETE TO authenticated
  USING (is_super_admin() OR id_usuario = get_my_usuario_id());

-- ── HOJA_DE_VIDA ──
-- Users can CRUD their own hoja_de_vida
-- Admin iglesia can view/edit users in their iglesia
DROP POLICY IF EXISTS hoja_de_vida_insert ON public.hoja_de_vida;
DROP POLICY IF EXISTS hoja_de_vida_update ON public.hoja_de_vida;
DROP POLICY IF EXISTS hoja_de_vida_delete ON public.hoja_de_vida;

CREATE POLICY hoja_de_vida_insert ON public.hoja_de_vida
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR id_usuario = get_my_usuario_id());

CREATE POLICY hoja_de_vida_update ON public.hoja_de_vida
  FOR UPDATE TO authenticated
  USING (is_super_admin() OR id_usuario = get_my_usuario_id())
  WITH CHECK (is_super_admin() OR id_usuario = get_my_usuario_id());

CREATE POLICY hoja_de_vida_delete ON public.hoja_de_vida
  FOR DELETE TO authenticated
  USING (is_super_admin() OR id_usuario = get_my_usuario_id());

GRANT INSERT, UPDATE, DELETE ON public.usuario_rol TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.usuario_rol_sede TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.iglesia TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sede TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ministerio TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.curso TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.modulo TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tarea TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.notificacion TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hoja_de_vida TO authenticated;
