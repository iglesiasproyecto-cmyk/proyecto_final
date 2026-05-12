-- Fix: Allow users to see courses they created
DROP POLICY IF EXISTS "aula_curso_select_tenant" ON public.aula_curso;

CREATE POLICY "aula_curso_select_tenant" ON public.aula_curso
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    -- User can see courses they created
    OR id_usuario_creador = get_my_usuario_id()
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
