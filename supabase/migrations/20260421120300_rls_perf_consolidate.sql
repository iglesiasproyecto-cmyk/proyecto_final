-- Performance hardening:
--   A. auth_rls_initplan (0003): wrap auth.uid() in (select auth.uid()) so
--      Postgres evaluates it once per query instead of once per row.
--   B. multiple_permissive_policies (0006): drop redundant SELECT/UPDATE
--      policies whose predicates are already covered by a sibling policy.

-- ============================================================================
-- A. usuario: consolidate SELECT + UPDATE, wrap auth.uid()
-- ============================================================================

DROP POLICY IF EXISTS "Usuario ve su propio perfil"            ON public.usuario;
DROP POLICY IF EXISTS "Scoped select usuario por iglesia"      ON public.usuario;
DROP POLICY IF EXISTS "Usuario puede actualizar su propio perfil" ON public.usuario;
DROP POLICY IF EXISTS "Admin puede actualizar cualquier usuario"  ON public.usuario;

CREATE POLICY "Scoped select usuario por iglesia" ON public.usuario
  FOR SELECT TO authenticated
  USING (
    auth_user_id = (select auth.uid())
    OR is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.usuario_rol ur_me
      JOIN public.usuario_rol ur_target
        ON ur_target.id_iglesia = ur_me.id_iglesia
       AND ur_target.fecha_fin IS NULL
      WHERE ur_me.id_usuario = current_usuario_id()
        AND ur_me.fecha_fin IS NULL
        AND ur_me.id_iglesia IS NOT NULL
        AND ur_target.id_usuario = usuario.id_usuario
    )
  );

CREATE POLICY "Scoped update usuario" ON public.usuario
  FOR UPDATE TO authenticated
  USING (
    auth_user_id = (select auth.uid())
    OR get_my_highest_role() = ANY (ARRAY['Super Administrador'::text, 'Administrador de Iglesia'::text])
  )
  WITH CHECK (
    auth_user_id = (select auth.uid())
    OR get_my_highest_role() = ANY (ARRAY['Super Administrador'::text, 'Administrador de Iglesia'::text])
  );

-- ============================================================================
-- A. tarea_asignada: wrap auth.uid()
-- ============================================================================

DROP POLICY IF EXISTS "Usuario ve sus tareas asignadas"              ON public.tarea_asignada;
DROP POLICY IF EXISTS "Usuario puede actualizar su propia tarea_asignada" ON public.tarea_asignada;

CREATE POLICY "Usuario ve sus tareas asignadas" ON public.tarea_asignada
  FOR SELECT TO authenticated
  USING (
    id_usuario = (
      SELECT id_usuario FROM public.usuario
      WHERE auth_user_id = (select auth.uid())
      LIMIT 1
    )
  );

CREATE POLICY "Usuario puede actualizar su propia tarea_asignada" ON public.tarea_asignada
  FOR UPDATE TO authenticated
  USING (
    id_usuario = (
      SELECT id_usuario FROM public.usuario
      WHERE auth_user_id = (select auth.uid())
      LIMIT 1
    )
    OR get_my_highest_role() = ANY (ARRAY['Super Administrador'::text, 'Administrador de Iglesia'::text, 'Líder'::text])
  )
  WITH CHECK (
    id_usuario = (
      SELECT id_usuario FROM public.usuario
      WHERE auth_user_id = (select auth.uid())
      LIMIT 1
    )
    OR get_my_highest_role() = ANY (ARRAY['Super Administrador'::text, 'Administrador de Iglesia'::text, 'Líder'::text])
  );

-- ============================================================================
-- A. miembro_ministerio: wrap auth.uid() across insert/update/delete
-- ============================================================================

DROP POLICY IF EXISTS "Scoped insert miembro_ministerio" ON public.miembro_ministerio;
DROP POLICY IF EXISTS "Scoped update miembro_ministerio" ON public.miembro_ministerio;
DROP POLICY IF EXISTS "Scoped delete miembro_ministerio" ON public.miembro_ministerio;

CREATE POLICY "Scoped insert miembro_ministerio" ON public.miembro_ministerio
  FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = miembro_ministerio.id_ministerio
          AND s.id_iglesia IN (SELECT id_iglesia FROM get_user_iglesias())
      )
      OR id_ministerio IN (
        SELECT (id_ministerio)::integer FROM get_user_ministerios()
      )
    )
  );

CREATE POLICY "Scoped update miembro_ministerio" ON public.miembro_ministerio
  FOR UPDATE TO authenticated
  USING (
    (select auth.uid()) IS NOT NULL
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = miembro_ministerio.id_ministerio
          AND s.id_iglesia IN (SELECT id_iglesia FROM get_user_iglesias())
      )
      OR id_ministerio IN (
        SELECT (id_ministerio)::integer FROM get_user_ministerios()
      )
    )
  )
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = miembro_ministerio.id_ministerio
          AND s.id_iglesia IN (SELECT id_iglesia FROM get_user_iglesias())
      )
      OR id_ministerio IN (
        SELECT (id_ministerio)::integer FROM get_user_ministerios()
      )
    )
  );

CREATE POLICY "Scoped delete miembro_ministerio" ON public.miembro_ministerio
  FOR DELETE TO authenticated
  USING (
    (select auth.uid()) IS NOT NULL
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = miembro_ministerio.id_ministerio
          AND s.id_iglesia IN (SELECT id_iglesia FROM get_user_iglesias())
      )
      OR id_ministerio IN (
        SELECT (id_ministerio)::integer FROM get_user_ministerios()
      )
    )
  );

-- ============================================================================
-- A. notificacion: wrap auth.uid()
-- ============================================================================

DROP POLICY IF EXISTS "Usuario puede actualizar su notificacion" ON public.notificacion;

CREATE POLICY "Usuario puede actualizar su notificacion" ON public.notificacion
  FOR UPDATE TO authenticated
  USING (
    id_usuario = (
      SELECT id_usuario FROM public.usuario
      WHERE auth_user_id = (select auth.uid())
      LIMIT 1
    )
  )
  WITH CHECK (
    id_usuario = (
      SELECT id_usuario FROM public.usuario
      WHERE auth_user_id = (select auth.uid())
      LIMIT 1
    )
  );

-- ============================================================================
-- B. Drop redundant permissive policies where a sibling already covers them.
-- ============================================================================

-- Catalogos publicos: dos policies con USING (true) sobre el mismo rol/accion.
DROP POLICY IF EXISTS "Lectura autenticada" ON public.ciudad;
DROP POLICY IF EXISTS "Lectura autenticada" ON public.departamento;
DROP POLICY IF EXISTS "Lectura autenticada" ON public.pais;
DROP POLICY IF EXISTS "Lectura autenticada" ON public.rol;
DROP POLICY IF EXISTS "Lectura autenticada" ON public.tipo_evento;

-- evaluacion: "Lectura evaluacion por gestion u own" ya incluye id_usuario = current_usuario_id().
DROP POLICY IF EXISTS "Usuario ve sus evaluaciones" ON public.evaluacion;

-- modulo: "Lectura modulo por gestion o inscripcion" ya incluye can_read_modulo_as_student.
DROP POLICY IF EXISTS "Servidor inscrito puede leer módulos publicados" ON public.modulo;

-- ministerio: fusionar las dos policies de SELECT en una.
DROP POLICY IF EXISTS "Lectura ministerios Líderes"  ON public.ministerio;
DROP POLICY IF EXISTS "Lectura ministerios por iglesia" ON public.ministerio;

CREATE POLICY "Lectura ministerios scoped" ON public.ministerio
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR id_ministerio IN (SELECT get_user_ministerios() AS g)
    OR EXISTS (
      SELECT 1 FROM public.sede s
      WHERE s.id_sede = ministerio.id_sede
        AND s.id_iglesia IN (SELECT get_user_iglesias() AS g)
    )
  );
