-- supabase/migrations/20260506200200_sp2_rls_tenant_scoped.sql
-- Reemplaza políticas permisivas con scoping por tenant_id usando JWT helpers

-- ── IGLESIA ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.iglesia;
DROP POLICY IF EXISTS "iglesia_select_tenant" ON public.iglesia;
DROP POLICY IF EXISTS "iglesia_mutations_super_admin" ON public.iglesia;

CREATE POLICY "iglesia_select_tenant" ON public.iglesia
  FOR SELECT TO authenticated
  USING (is_super_admin() OR id_iglesia = get_my_tenant_id());

CREATE POLICY "iglesia_mutations_super_admin" ON public.iglesia
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "iglesia_update_super_admin" ON public.iglesia
  FOR UPDATE TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "iglesia_delete_super_admin" ON public.iglesia
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- ── SEDE ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.sede;
DROP POLICY IF EXISTS "sede_select_tenant" ON public.sede;
DROP POLICY IF EXISTS "sede_mutations_admin" ON public.sede;

CREATE POLICY "sede_select_tenant" ON public.sede
  FOR SELECT TO authenticated
  USING (is_super_admin() OR id_iglesia = get_my_tenant_id());

CREATE POLICY "sede_mutations_admin" ON public.sede
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()));

CREATE POLICY "sede_update_admin" ON public.sede
  FOR UPDATE TO authenticated
  USING (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()))
  WITH CHECK (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()));

CREATE POLICY "sede_delete_admin" ON public.sede
  FOR DELETE TO authenticated
  USING (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()));

-- ── MINISTERIO ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.ministerio;
DROP POLICY IF EXISTS "ministerio_select_tenant" ON public.ministerio;
DROP POLICY IF EXISTS "ministerio_mutations_admin_lider" ON public.ministerio;

CREATE POLICY "ministerio_select_tenant" ON public.ministerio
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (SELECT 1 FROM public.sede s WHERE s.id_sede = ministerio.id_sede AND s.id_iglesia = get_my_tenant_id())
  );

CREATE POLICY "ministerio_insert_admin" ON public.ministerio
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND EXISTS (SELECT 1 FROM public.sede s WHERE s.id_sede = id_sede AND s.id_iglesia = get_my_tenant_id())
    )
  );

CREATE POLICY "ministerio_update_admin_lider" ON public.ministerio
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND EXISTS (SELECT 1 FROM public.sede s WHERE s.id_sede = ministerio.id_sede AND s.id_iglesia = get_my_tenant_id()))
    OR id_ministerio IN (SELECT id FROM get_my_ministerios())
  )
  WITH CHECK (
    is_super_admin()
    OR (is_admin_iglesia() AND EXISTS (SELECT 1 FROM public.sede s WHERE s.id_sede = id_sede AND s.id_iglesia = get_my_tenant_id()))
  );

CREATE POLICY "ministerio_delete_admin" ON public.ministerio
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND EXISTS (SELECT 1 FROM public.sede s WHERE s.id_sede = ministerio.id_sede AND s.id_iglesia = get_my_tenant_id()))
  );

-- ── PASTOR ───────────────────────────────────────────────────────
-- pastor aún no tiene id_iglesia directo (se agrega en SP-3)
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.pastor;
DROP POLICY IF EXISTS "pastor_select_tenant" ON public.pastor;
DROP POLICY IF EXISTS "pastor_mutations_admin" ON public.pastor;

CREATE POLICY "pastor_select_tenant" ON public.pastor
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.iglesia_pastor ip
      WHERE ip.id_pastor = pastor.id_pastor
        AND ip.id_iglesia = get_my_tenant_id()
        AND ip.fecha_fin IS NULL
    )
  );

CREATE POLICY "pastor_insert_admin" ON public.pastor
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR is_admin_iglesia());

CREATE POLICY "pastor_update_admin" ON public.pastor
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND EXISTS (
      SELECT 1 FROM public.iglesia_pastor ip
      WHERE ip.id_pastor = pastor.id_pastor AND ip.id_iglesia = get_my_tenant_id() AND ip.fecha_fin IS NULL
    ))
  )
  WITH CHECK (is_super_admin() OR is_admin_iglesia());

CREATE POLICY "pastor_delete_admin" ON public.pastor
  FOR DELETE TO authenticated
  USING (is_super_admin() OR is_admin_iglesia());

-- ── USUARIO ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Acceso autenticado usuarios" ON public.usuario;
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.usuario;
DROP POLICY IF EXISTS "usuario_select_tenant" ON public.usuario;
DROP POLICY IF EXISTS "usuario_mutations_admin" ON public.usuario;

CREATE POLICY "usuario_select_tenant" ON public.usuario
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR auth_user_id = auth.uid()
    OR (
      is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.usuario_rol ur
        WHERE ur.id_usuario = usuario.id_usuario
          AND ur.id_iglesia = get_my_tenant_id()
          AND ur.fecha_fin IS NULL
      )
    )
    OR (
      get_my_role() IN ('lider', 'servidor')
      AND EXISTS (
        SELECT 1 FROM public.miembro_ministerio mm
        JOIN public.miembro_ministerio mm2 ON mm2.id_ministerio = mm.id_ministerio
        WHERE mm2.id_usuario = get_my_usuario_id()
          AND mm.id_usuario = usuario.id_usuario
          AND mm.fecha_salida IS NULL
          AND mm2.fecha_salida IS NULL
      )
    )
  );

CREATE POLICY "usuario_insert_admin" ON public.usuario
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR is_admin_iglesia() OR auth_user_id = auth.uid());

CREATE POLICY "usuario_update_admin" ON public.usuario
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR auth_user_id = auth.uid()
    OR (is_admin_iglesia() AND EXISTS (
      SELECT 1 FROM public.usuario_rol ur
      WHERE ur.id_usuario = usuario.id_usuario AND ur.id_iglesia = get_my_tenant_id() AND ur.fecha_fin IS NULL
    ))
  )
  WITH CHECK (is_super_admin() OR is_admin_iglesia() OR auth_user_id = auth.uid());

CREATE POLICY "usuario_delete_admin" ON public.usuario
  FOR DELETE TO authenticated
  USING (is_super_admin() OR (is_admin_iglesia() AND EXISTS (
    SELECT 1 FROM public.usuario_rol ur
    WHERE ur.id_usuario = usuario.id_usuario AND ur.id_iglesia = get_my_tenant_id() AND ur.fecha_fin IS NULL
  )));

-- ── EVENTO ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.evento;
DROP POLICY IF EXISTS "evento_select_tenant" ON public.evento;
DROP POLICY IF EXISTS "evento_mutations_admin_lider" ON public.evento;

CREATE POLICY "evento_select_tenant" ON public.evento
  FOR SELECT TO authenticated
  USING (is_super_admin() OR id_iglesia = get_my_tenant_id());

CREATE POLICY "evento_insert_admin_lider" ON public.evento
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
    OR (get_my_role() = 'lider' AND id_iglesia = get_my_tenant_id())
  );

CREATE POLICY "evento_update_admin_lider" ON public.evento
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
    OR (get_my_role() = 'lider' AND id_iglesia = get_my_tenant_id()
      AND (id_ministerio IS NULL OR id_ministerio IN (SELECT id FROM get_my_ministerios())))
  )
  WITH CHECK (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
    OR (get_my_role() = 'lider' AND id_iglesia = get_my_tenant_id())
  );

CREATE POLICY "evento_delete_admin_lider" ON public.evento
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
    OR (get_my_role() = 'lider' AND id_iglesia = get_my_tenant_id())
  );

-- ── TAREA ────────────────────────────────────────────────────────
-- tarea aún no tiene id_iglesia (se agrega en SP-3), usar id_ministerio como proxy
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.tarea;
DROP POLICY IF EXISTS "tarea_select_tenant" ON public.tarea;
DROP POLICY IF EXISTS "tarea_mutations_admin_lider" ON public.tarea;

CREATE POLICY "tarea_select_tenant" ON public.tarea
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND (
      id_ministerio IS NULL
      OR id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        JOIN public.sede s ON m.id_sede = s.id_sede
        WHERE s.id_iglesia = get_my_tenant_id()
      )
    ))
    OR id_ministerio IN (SELECT id FROM get_my_ministerios())
    OR id_tarea IN (SELECT ta.id_tarea FROM public.tarea_asignada ta WHERE ta.id_usuario = get_my_usuario_id())
  );

CREATE POLICY "tarea_insert_admin_lider" ON public.tarea
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR is_admin_iglesia()
    OR (get_my_role() = 'lider' AND id_ministerio IN (SELECT id FROM get_my_ministerios()))
  );

CREATE POLICY "tarea_update_admin_lider" ON public.tarea
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_ministerio IN (
      SELECT m.id_ministerio FROM public.ministerio m
      JOIN public.sede s ON m.id_sede = s.id_sede WHERE s.id_iglesia = get_my_tenant_id()
    ))
    OR (get_my_role() = 'lider' AND id_ministerio IN (SELECT id FROM get_my_ministerios()))
  )
  WITH CHECK (
    is_super_admin()
    OR is_admin_iglesia()
    OR (get_my_role() = 'lider' AND id_ministerio IN (SELECT id FROM get_my_ministerios()))
  );

CREATE POLICY "tarea_delete_admin_lider" ON public.tarea
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_ministerio IN (
      SELECT m.id_ministerio FROM public.ministerio m
      JOIN public.sede s ON m.id_sede = s.id_sede WHERE s.id_iglesia = get_my_tenant_id()
    ))
    OR (get_my_role() = 'lider' AND id_ministerio IN (SELECT id FROM get_my_ministerios()))
  );

-- ── NOTIFICACION ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Solo propias notificaciones" ON public.notificacion;
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.notificacion;
DROP POLICY IF EXISTS "notificacion_own" ON public.notificacion;

CREATE POLICY "notificacion_own" ON public.notificacion
  FOR ALL TO authenticated
  USING (id_usuario = get_my_usuario_id())
  WITH CHECK (id_usuario = get_my_usuario_id());

-- ── MIEMBRO_MINISTERIO ───────────────────────────────────────────
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.miembro_ministerio;
DROP POLICY IF EXISTS "miembro_ministerio_select" ON public.miembro_ministerio;
DROP POLICY IF EXISTS "miembro_ministerio_mutations" ON public.miembro_ministerio;

CREATE POLICY "miembro_ministerio_select" ON public.miembro_ministerio
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_ministerio IN (
      SELECT m.id_ministerio FROM public.ministerio m
      JOIN public.sede s ON m.id_sede = s.id_sede WHERE s.id_iglesia = get_my_tenant_id()
    ))
    OR id_ministerio IN (SELECT id FROM get_my_ministerios())
    OR id_usuario = get_my_usuario_id()
  );

CREATE POLICY "miembro_ministerio_insert" ON public.miembro_ministerio
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (is_admin_iglesia() AND id_ministerio IN (
      SELECT m.id_ministerio FROM public.ministerio m
      JOIN public.sede s ON m.id_sede = s.id_sede WHERE s.id_iglesia = get_my_tenant_id()
    ))
    OR (get_my_role() = 'lider' AND id_ministerio IN (SELECT id FROM get_my_ministerios()))
  );

CREATE POLICY "miembro_ministerio_update" ON public.miembro_ministerio
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_ministerio IN (
      SELECT m.id_ministerio FROM public.ministerio m
      JOIN public.sede s ON m.id_sede = s.id_sede WHERE s.id_iglesia = get_my_tenant_id()
    ))
    OR (get_my_role() = 'lider' AND id_ministerio IN (SELECT id FROM get_my_ministerios()))
  )
  WITH CHECK (
    is_super_admin() OR is_admin_iglesia()
    OR (get_my_role() = 'lider' AND id_ministerio IN (SELECT id FROM get_my_ministerios()))
  );

CREATE POLICY "miembro_ministerio_delete" ON public.miembro_ministerio
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_ministerio IN (
      SELECT m.id_ministerio FROM public.ministerio m
      JOIN public.sede s ON m.id_sede = s.id_sede WHERE s.id_iglesia = get_my_tenant_id()
    ))
    OR (get_my_role() = 'lider' AND id_ministerio IN (SELECT id FROM get_my_ministerios()))
  );

-- ── USUARIO_ROL ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.usuario_rol;
DROP POLICY IF EXISTS "usuario_rol_select_tenant" ON public.usuario_rol;
DROP POLICY IF EXISTS "usuario_rol_mutations_admin" ON public.usuario_rol;

CREATE POLICY "usuario_rol_select_tenant" ON public.usuario_rol
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
  );

CREATE POLICY "usuario_rol_insert_admin" ON public.usuario_rol
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND id_iglesia = get_my_tenant_id()
      -- admin_iglesia no puede asignar super_admin
      AND id_rol NOT IN (SELECT id_rol FROM public.rol WHERE nombre ILIKE '%super%')
    )
  );

CREATE POLICY "usuario_rol_update_admin" ON public.usuario_rol
  FOR UPDATE TO authenticated
  USING (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()))
  WITH CHECK (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()
      AND id_rol NOT IN (SELECT id_rol FROM public.rol WHERE nombre ILIKE '%super%'))
  );

CREATE POLICY "usuario_rol_delete_admin" ON public.usuario_rol
  FOR DELETE TO authenticated
  USING (is_super_admin() OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id()));
