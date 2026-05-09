-- SP9: Admin Sede support + academic RLS hardening

CREATE OR REPLACE FUNCTION public.is_admin_sede()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(get_my_role() = 'admin_sede', false);
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin_sede() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_sede() TO authenticated;

-- aula_curso: allow admin_sede in tenant scope
DROP POLICY IF EXISTS aula_curso_admin_sede_select ON public.aula_curso;
CREATE POLICY aula_curso_admin_sede_select ON public.aula_curso
  FOR SELECT TO authenticated
  USING (
    is_admin_sede()
    AND (
      id_iglesia = get_my_tenant_id()
      OR id_ministerio IN (
        SELECT m.id_ministerio
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE s.id_iglesia = get_my_tenant_id()
      )
    )
  );

DROP POLICY IF EXISTS aula_curso_admin_sede_write ON public.aula_curso;
CREATE POLICY aula_curso_admin_sede_write ON public.aula_curso
  FOR ALL TO authenticated
  USING (
    is_admin_sede()
    AND (
      id_iglesia = get_my_tenant_id()
      OR id_ministerio IN (
        SELECT m.id_ministerio
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE s.id_iglesia = get_my_tenant_id()
      )
    )
  )
  WITH CHECK (
    is_admin_sede()
    AND (
      id_iglesia = get_my_tenant_id()
      OR id_ministerio IN (
        SELECT m.id_ministerio
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE s.id_iglesia = get_my_tenant_id()
      )
    )
  );

-- aula_modulo: admin_sede can manage modules for tenant courses
DROP POLICY IF EXISTS aula_modulo_admin_sede_all ON public.aula_modulo;
CREATE POLICY aula_modulo_admin_sede_all ON public.aula_modulo
  FOR ALL TO authenticated
  USING (
    is_admin_sede()
    AND id_aula_curso IN (
      SELECT ac.id_aula_curso
      FROM public.aula_curso ac
      LEFT JOIN public.ministerio m ON m.id_ministerio = ac.id_ministerio
      LEFT JOIN public.sede s ON s.id_sede = m.id_sede
      WHERE ac.id_iglesia = get_my_tenant_id() OR s.id_iglesia = get_my_tenant_id()
    )
  )
  WITH CHECK (
    is_admin_sede()
    AND id_aula_curso IN (
      SELECT ac.id_aula_curso
      FROM public.aula_curso ac
      LEFT JOIN public.ministerio m ON m.id_ministerio = ac.id_ministerio
      LEFT JOIN public.sede s ON s.id_sede = m.id_sede
      WHERE ac.id_iglesia = get_my_tenant_id() OR s.id_iglesia = get_my_tenant_id()
    )
  );

-- aula_inscripcion: admin_sede can read/manage enrollments in tenant courses
DROP POLICY IF EXISTS aula_inscripcion_admin_sede_all ON public.aula_inscripcion;
CREATE POLICY aula_inscripcion_admin_sede_all ON public.aula_inscripcion
  FOR ALL TO authenticated
  USING (
    is_admin_sede()
    AND id_aula_curso IN (
      SELECT ac.id_aula_curso
      FROM public.aula_curso ac
      LEFT JOIN public.ministerio m ON m.id_ministerio = ac.id_ministerio
      LEFT JOIN public.sede s ON s.id_sede = m.id_sede
      WHERE ac.id_iglesia = get_my_tenant_id() OR s.id_iglesia = get_my_tenant_id()
    )
  )
  WITH CHECK (
    is_admin_sede()
    AND id_aula_curso IN (
      SELECT ac.id_aula_curso
      FROM public.aula_curso ac
      LEFT JOIN public.ministerio m ON m.id_ministerio = ac.id_ministerio
      LEFT JOIN public.sede s ON s.id_sede = m.id_sede
      WHERE ac.id_iglesia = get_my_tenant_id() OR s.id_iglesia = get_my_tenant_id()
    )
  );

-- aula_progreso_actividad: admin_sede read/write in tenant courses
DROP POLICY IF EXISTS aula_progreso_actividad_admin_sede_all ON public.aula_progreso_actividad;
CREATE POLICY aula_progreso_actividad_admin_sede_all ON public.aula_progreso_actividad
  FOR ALL TO authenticated
  USING (
    is_admin_sede()
    AND id_aula_actividad IN (
      SELECT aa.id_aula_actividad
      FROM public.aula_actividad aa
      JOIN public.aula_modulo am ON am.id_aula_modulo = aa.id_aula_modulo
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      LEFT JOIN public.ministerio m ON m.id_ministerio = ac.id_ministerio
      LEFT JOIN public.sede s ON s.id_sede = m.id_sede
      WHERE ac.id_iglesia = get_my_tenant_id() OR s.id_iglesia = get_my_tenant_id()
    )
  )
  WITH CHECK (
    is_admin_sede()
    AND id_aula_actividad IN (
      SELECT aa.id_aula_actividad
      FROM public.aula_actividad aa
      JOIN public.aula_modulo am ON am.id_aula_modulo = aa.id_aula_modulo
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      LEFT JOIN public.ministerio m ON m.id_ministerio = ac.id_ministerio
      LEFT JOIN public.sede s ON s.id_sede = m.id_sede
      WHERE ac.id_iglesia = get_my_tenant_id() OR s.id_iglesia = get_my_tenant_id()
    )
  );

-- aula_modulo_archivo / aula_modulo_enlace
DROP POLICY IF EXISTS aula_modulo_archivo_admin_sede_all ON public.aula_modulo_archivo;
CREATE POLICY aula_modulo_archivo_admin_sede_all ON public.aula_modulo_archivo
  FOR ALL TO authenticated
  USING (
    is_admin_sede()
    AND id_aula_modulo IN (
      SELECT am.id_aula_modulo
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      LEFT JOIN public.ministerio m ON m.id_ministerio = ac.id_ministerio
      LEFT JOIN public.sede s ON s.id_sede = m.id_sede
      WHERE ac.id_iglesia = get_my_tenant_id() OR s.id_iglesia = get_my_tenant_id()
    )
  )
  WITH CHECK (
    is_admin_sede()
    AND id_aula_modulo IN (
      SELECT am.id_aula_modulo
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      LEFT JOIN public.ministerio m ON m.id_ministerio = ac.id_ministerio
      LEFT JOIN public.sede s ON s.id_sede = m.id_sede
      WHERE ac.id_iglesia = get_my_tenant_id() OR s.id_iglesia = get_my_tenant_id()
    )
  );

DROP POLICY IF EXISTS aula_modulo_enlace_admin_sede_all ON public.aula_modulo_enlace;
CREATE POLICY aula_modulo_enlace_admin_sede_all ON public.aula_modulo_enlace
  FOR ALL TO authenticated
  USING (
    is_admin_sede()
    AND id_aula_modulo IN (
      SELECT am.id_aula_modulo
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      LEFT JOIN public.ministerio m ON m.id_ministerio = ac.id_ministerio
      LEFT JOIN public.sede s ON s.id_sede = m.id_sede
      WHERE ac.id_iglesia = get_my_tenant_id() OR s.id_iglesia = get_my_tenant_id()
    )
  )
  WITH CHECK (
    is_admin_sede()
    AND id_aula_modulo IN (
      SELECT am.id_aula_modulo
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      LEFT JOIN public.ministerio m ON m.id_ministerio = ac.id_ministerio
      LEFT JOIN public.sede s ON s.id_sede = m.id_sede
      WHERE ac.id_iglesia = get_my_tenant_id() OR s.id_iglesia = get_my_tenant_id()
    )
  );

-- storage.objects: admin_sede in aula-recursos bucket
DROP POLICY IF EXISTS "Aula recursos admin_sede select" ON storage.objects;
CREATE POLICY "Aula recursos admin_sede select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'aula-recursos'
    AND is_admin_sede()
    AND EXISTS (
      SELECT 1
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      LEFT JOIN public.ministerio m ON m.id_ministerio = ac.id_ministerio
      LEFT JOIN public.sede s ON s.id_sede = m.id_sede
      WHERE am.id_aula_modulo = ((regexp_match(name, '^modulo-(\d+)/'))[1])::bigint
        AND (ac.id_iglesia = get_my_tenant_id() OR s.id_iglesia = get_my_tenant_id())
    )
  );

DROP POLICY IF EXISTS "Aula recursos admin_sede write" ON storage.objects;
CREATE POLICY "Aula recursos admin_sede write" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'aula-recursos'
    AND is_admin_sede()
    AND EXISTS (
      SELECT 1
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      LEFT JOIN public.ministerio m ON m.id_ministerio = ac.id_ministerio
      LEFT JOIN public.sede s ON s.id_sede = m.id_sede
      WHERE am.id_aula_modulo = ((regexp_match(name, '^modulo-(\d+)/'))[1])::bigint
        AND (ac.id_iglesia = get_my_tenant_id() OR s.id_iglesia = get_my_tenant_id())
    )
  )
  WITH CHECK (
    bucket_id = 'aula-recursos'
    AND is_admin_sede()
    AND EXISTS (
      SELECT 1
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      LEFT JOIN public.ministerio m ON m.id_ministerio = ac.id_ministerio
      LEFT JOIN public.sede s ON s.id_sede = m.id_sede
      WHERE am.id_aula_modulo = ((regexp_match(name, '^modulo-(\d+)/'))[1])::bigint
        AND (ac.id_iglesia = get_my_tenant_id() OR s.id_iglesia = get_my_tenant_id())
    )
  );
