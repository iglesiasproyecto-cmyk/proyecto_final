-- Fix RLS scope for aula_modulo mutations
-- Problem: admin_iglesia could create cursos at iglesia level, but failed to
-- insert modulos for ministerio-level cursos in their own iglesia.

-- Remove legacy/conflicting policies
DROP POLICY IF EXISTS "aula_modulo super admin" ON public.aula_modulo;
DROP POLICY IF EXISTS aula_modulo_select ON public.aula_modulo;
DROP POLICY IF EXISTS aula_modulo_write ON public.aula_modulo;
DROP POLICY IF EXISTS "Super admin can manage all modulos" ON public.aula_modulo;
DROP POLICY IF EXISTS "Admin iglesia can manage modulos in their iglesia" ON public.aula_modulo;
DROP POLICY IF EXISTS "Lider can manage modulos in their cursos" ON public.aula_modulo;
DROP POLICY IF EXISTS "Servidor can read modulos publicados in their cursos" ON public.aula_modulo;
DROP POLICY IF EXISTS "aula_modulo_select_tenant" ON public.aula_modulo;
DROP POLICY IF EXISTS "aula_modulo_insert_tenant" ON public.aula_modulo;
DROP POLICY IF EXISTS "aula_modulo_update_tenant" ON public.aula_modulo;
DROP POLICY IF EXISTS "aula_modulo_delete_tenant" ON public.aula_modulo;

-- Read access
CREATE POLICY "aula_modulo_select_tenant" ON public.aula_modulo
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR id_aula_curso IN (
      SELECT ac.id_aula_curso
      FROM public.aula_curso ac
      WHERE
        (
          ac.id_iglesia IS NOT NULL
          AND ac.id_iglesia = get_my_tenant_id()
        )
        OR (
          ac.id_ministerio IS NOT NULL
          AND ac.id_ministerio IN (SELECT id FROM get_my_ministerios())
        )
        OR (
          is_admin_iglesia()
          AND ac.id_ministerio IS NOT NULL
          AND ac.id_ministerio IN (
            SELECT m.id_ministerio
            FROM public.ministerio m
            JOIN public.sede s ON s.id_sede = m.id_sede
            WHERE s.id_iglesia = get_my_tenant_id()
          )
        )
    )
  );

-- Insert access
CREATE POLICY "aula_modulo_insert_tenant" ON public.aula_modulo
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND id_aula_curso IN (
        SELECT ac.id_aula_curso
        FROM public.aula_curso ac
        WHERE
          (
            ac.id_iglesia IS NOT NULL
            AND ac.id_iglesia = get_my_tenant_id()
          )
          OR (
            ac.id_ministerio IS NOT NULL
            AND ac.id_ministerio IN (
              SELECT m.id_ministerio
              FROM public.ministerio m
              JOIN public.sede s ON s.id_sede = m.id_sede
              WHERE s.id_iglesia = get_my_tenant_id()
            )
          )
      )
    )
    OR (
      get_my_role() = 'lider'
      AND id_aula_curso IN (
        SELECT ac.id_aula_curso
        FROM public.aula_curso ac
        WHERE ac.id_ministerio IN (SELECT id FROM get_my_ministerios())
      )
    )
  );

-- Update access
CREATE POLICY "aula_modulo_update_tenant" ON public.aula_modulo
  FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND id_aula_curso IN (
        SELECT ac.id_aula_curso
        FROM public.aula_curso ac
        WHERE
          (
            ac.id_iglesia IS NOT NULL
            AND ac.id_iglesia = get_my_tenant_id()
          )
          OR (
            ac.id_ministerio IS NOT NULL
            AND ac.id_ministerio IN (
              SELECT m.id_ministerio
              FROM public.ministerio m
              JOIN public.sede s ON s.id_sede = m.id_sede
              WHERE s.id_iglesia = get_my_tenant_id()
            )
          )
      )
    )
    OR (
      get_my_role() = 'lider'
      AND id_aula_curso IN (
        SELECT ac.id_aula_curso
        FROM public.aula_curso ac
        WHERE ac.id_ministerio IN (SELECT id FROM get_my_ministerios())
      )
    )
  )
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND id_aula_curso IN (
        SELECT ac.id_aula_curso
        FROM public.aula_curso ac
        WHERE
          (
            ac.id_iglesia IS NOT NULL
            AND ac.id_iglesia = get_my_tenant_id()
          )
          OR (
            ac.id_ministerio IS NOT NULL
            AND ac.id_ministerio IN (
              SELECT m.id_ministerio
              FROM public.ministerio m
              JOIN public.sede s ON s.id_sede = m.id_sede
              WHERE s.id_iglesia = get_my_tenant_id()
            )
          )
      )
    )
    OR (
      get_my_role() = 'lider'
      AND id_aula_curso IN (
        SELECT ac.id_aula_curso
        FROM public.aula_curso ac
        WHERE ac.id_ministerio IN (SELECT id FROM get_my_ministerios())
      )
    )
  );

-- Delete access
CREATE POLICY "aula_modulo_delete_tenant" ON public.aula_modulo
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (
      is_admin_iglesia()
      AND id_aula_curso IN (
        SELECT ac.id_aula_curso
        FROM public.aula_curso ac
        WHERE
          (
            ac.id_iglesia IS NOT NULL
            AND ac.id_iglesia = get_my_tenant_id()
          )
          OR (
            ac.id_ministerio IS NOT NULL
            AND ac.id_ministerio IN (
              SELECT m.id_ministerio
              FROM public.ministerio m
              JOIN public.sede s ON s.id_sede = m.id_sede
              WHERE s.id_iglesia = get_my_tenant_id()
            )
          )
      )
    )
    OR (
      get_my_role() = 'lider'
      AND id_aula_curso IN (
        SELECT ac.id_aula_curso
        FROM public.aula_curso ac
        WHERE ac.id_ministerio IN (SELECT id FROM get_my_ministerios())
      )
    )
  );
