-- Migration: Fix aula_modulo RLS policy for lider role
-- Date: 2026-05-16
-- Issue: RLS policy was checking for 'Líder' (capitalized) but actual role value is 'lider' (lowercase)

-- Fix the lider policy for aula_modulo
DROP POLICY IF EXISTS "Lider can manage modulos in their cursos" ON public.aula_modulo;
CREATE POLICY "Lider can manage modulos in their cursos" ON public.aula_modulo
  FOR ALL TO authenticated
  USING (
    aula_modulo.id_aula_curso IN (
      SELECT ac.id_aula_curso FROM public.aula_curso ac
      WHERE ac.id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        JOIN public.miembro_ministerio mm ON mm.id_ministerio = m.id_ministerio
        WHERE mm.id_usuario = public.current_usuario_id()
          AND mm.rol_en_ministerio = 'lider'
          AND mm.fecha_salida IS NULL
      )
      OR ac.id_usuario_creador = public.current_usuario_id()
    )
  )
  WITH CHECK (
    aula_modulo.id_aula_curso IN (
      SELECT ac.id_aula_curso FROM public.aula_curso ac
      WHERE ac.id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        JOIN public.miembro_ministerio mm ON mm.id_ministerio = m.id_ministerio
        WHERE mm.id_usuario = public.current_usuario_id()
          AND mm.rol_en_ministerio = 'lider'
          AND mm.fecha_salida IS NULL
      )
      OR ac.id_usuario_creador = public.current_usuario_id()
    )
  );

-- Also fix aula_modulo_archivo RLS for consistency
DROP POLICY IF EXISTS "Lider can manage modulo archivos in their cursos" ON public.aula_modulo_archivo;
CREATE POLICY "Lider can manage modulo archivos in their cursos" ON public.aula_modulo_archivo
  FOR ALL TO authenticated
  USING (
    aula_modulo_archivo.id_aula_modulo IN (
      SELECT am.id_aula_modulo FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        JOIN public.miembro_ministerio mm ON mm.id_ministerio = m.id_ministerio
        WHERE mm.id_usuario = public.current_usuario_id()
          AND mm.rol_en_ministerio = 'lider'
          AND mm.fecha_salida IS NULL
      )
      OR ac.id_usuario_creador = public.current_usuario_id()
    )
  )
  WITH CHECK (
    aula_modulo_archivo.id_aula_modulo IN (
      SELECT am.id_aula_modulo FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        JOIN public.miembro_ministerio mm ON mm.id_ministerio = m.id_ministerio
        WHERE mm.id_usuario = public.current_usuario_id()
          AND mm.rol_en_ministerio = 'lider'
          AND mm.fecha_salida IS NULL
      )
      OR ac.id_usuario_creador = public.current_usuario_id()
    )
  );

-- Also fix aula_modulo_enlace RLS for consistency
DROP POLICY IF EXISTS "Lider can manage modulo enlaces in their cursos" ON public.aula_modulo_enlace;
CREATE POLICY "Lider can manage modulo enlaces in their cursos" ON public.aula_modulo_enlace
  FOR ALL TO authenticated
  USING (
    aula_modulo_enlace.id_aula_modulo IN (
      SELECT am.id_aula_modulo FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        JOIN public.miembro_ministerio mm ON mm.id_ministerio = m.id_ministerio
        WHERE mm.id_usuario = public.current_usuario_id()
          AND mm.rol_en_ministerio = 'lider'
          AND mm.fecha_salida IS NULL
      )
      OR ac.id_usuario_creador = public.current_usuario_id()
    )
  )
  WITH CHECK (
    aula_modulo_enlace.id_aula_modulo IN (
      SELECT am.id_aula_modulo FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        JOIN public.miembro_ministerio mm ON mm.id_ministerio = m.id_ministerio
        WHERE mm.id_usuario = public.current_usuario_id()
          AND mm.rol_en_ministerio = 'lider'
          AND mm.fecha_salida IS NULL
      )
      OR ac.id_usuario_creador = public.current_usuario_id()
    )
  );
