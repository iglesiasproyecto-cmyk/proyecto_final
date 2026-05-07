-- supabase/migrations/20260506400000_sp5_aula_rls_multinivel.sql

-- Drop any existing permissive/dev policies
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.aula_curso;
DROP POLICY IF EXISTS "Admin iglesia can manage cursos in their iglesia" ON public.aula_curso;
DROP POLICY IF EXISTS "Lider can manage cursos in their ministerios" ON public.aula_curso;
DROP POLICY IF EXISTS "Authenticated can read active cursos" ON public.aula_curso;

-- ── aula_curso SELECT ────────────────────────────────────────────
-- Ver cursos de tu iglesia (nivel iglesia) o de tus ministerios (nivel ministerio)
CREATE POLICY "aula_curso_select_tenant" ON public.aula_curso
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    -- Curso de iglesia: si eres miembro de esa iglesia
    OR (
      id_iglesia IS NOT NULL
      AND id_iglesia = get_my_tenant_id()
    )
    -- Curso de ministerio: si perteneces a ese ministerio
    OR (
      id_ministerio IS NOT NULL
      AND id_ministerio IN (SELECT id FROM get_my_ministerios())
    )
    -- Admin ve todos los cursos de su iglesia (tanto nivel iglesia como ministerio)
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
  );

-- ── aula_curso INSERT ────────────────────────────────────────────
-- admin crea cursos de iglesia, lider crea cursos de ministerio
CREATE POLICY "aula_curso_insert" ON public.aula_curso
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND (
        -- Curso de iglesia propio
        (id_iglesia IS NOT NULL AND id_iglesia = get_my_tenant_id())
        -- Curso de ministerio en su iglesia
        OR (
          id_ministerio IS NOT NULL
          AND id_ministerio IN (
            SELECT m.id_ministerio FROM public.ministerio m
            JOIN public.sede s ON s.id_sede = m.id_sede
            WHERE s.id_iglesia = get_my_tenant_id()
          )
        )
      )
    )
    -- Lider crea cursos solo de sus ministerios
    OR (
      get_my_role() = 'lider'
      AND id_ministerio IS NOT NULL
      AND id_ministerio IN (SELECT id FROM get_my_ministerios())
    )
  );

-- ── aula_curso UPDATE ────────────────────────────────────────────
CREATE POLICY "aula_curso_update" ON public.aula_curso
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND (
      id_iglesia = get_my_tenant_id()
      OR id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE s.id_iglesia = get_my_tenant_id()
      )
    ))
    OR (get_my_role() = 'lider' AND id_ministerio IN (SELECT id FROM get_my_ministerios()))
  )
  WITH CHECK (
    is_super_admin()
    OR is_admin_iglesia()
    OR (get_my_role() = 'lider' AND id_ministerio IN (SELECT id FROM get_my_ministerios()))
  );

-- ── aula_curso DELETE ────────────────────────────────────────────
CREATE POLICY "aula_curso_delete" ON public.aula_curso
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin_iglesia() AND (
      id_iglesia = get_my_tenant_id()
      OR id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE s.id_iglesia = get_my_tenant_id()
      )
    ))
    OR (get_my_role() = 'lider' AND id_ministerio IN (SELECT id FROM get_my_ministerios()))
  );

-- ── aula_inscripcion ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Acceso desarrollo" ON public.aula_inscripcion;
DROP POLICY IF EXISTS "aula_inscripcion_select" ON public.aula_inscripcion;
DROP POLICY IF EXISTS "aula_inscripcion_insert" ON public.aula_inscripcion;

CREATE POLICY "aula_inscripcion_select" ON public.aula_inscripcion
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
    OR (is_admin_iglesia() AND id_aula_curso IN (
      SELECT ac.id_aula_curso FROM public.aula_curso ac
      WHERE ac.id_iglesia = get_my_tenant_id()
         OR ac.id_ministerio IN (
           SELECT m.id_ministerio FROM public.ministerio m
           JOIN public.sede s ON s.id_sede = m.id_sede
           WHERE s.id_iglesia = get_my_tenant_id()
         )
    ))
    OR (get_my_role() = 'lider' AND id_aula_curso IN (
      SELECT ac.id_aula_curso FROM public.aula_curso ac
      WHERE ac.id_ministerio IN (SELECT id FROM get_my_ministerios())
    ))
  );

CREATE POLICY "aula_inscripcion_insert" ON public.aula_inscripcion
  FOR INSERT TO authenticated
  WITH CHECK (
    id_usuario = get_my_usuario_id()
    OR is_super_admin()
    OR is_admin_iglesia()
    OR (get_my_role() = 'lider' AND id_aula_curso IN (
      SELECT ac.id_aula_curso FROM public.aula_curso ac
      WHERE ac.id_ministerio IN (SELECT id FROM get_my_ministerios())
    ))
  );
