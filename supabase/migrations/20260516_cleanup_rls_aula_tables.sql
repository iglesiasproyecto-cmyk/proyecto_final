-- Migration: Clean up and standardize RLS policies for aula tables
-- Date: 2026-05-16
-- Purpose: Remove conflicting policies and create a coherent permission model

-- ============================================================================
-- AULA_CURSO RLS POLICIES
-- ============================================================================

-- Drop all existing policies on aula_curso
DROP POLICY IF EXISTS "Super admin can manage all cursos" ON public.aula_curso;
DROP POLICY IF EXISTS "Admin iglesia can manage cursos in their iglesia" ON public.aula_curso;
DROP POLICY IF EXISTS "Lider can manage cursos in their ministerios" ON public.aula_curso;
DROP POLICY IF EXISTS "Servidor can read cursos they are enrolled in" ON public.aula_curso;
DROP POLICY IF EXISTS "aula_curso super admin" ON public.aula_curso;
DROP POLICY IF EXISTS "aula_curso_admin_sede_all" ON public.aula_curso;

-- Super admin: full access
CREATE POLICY "aula_curso_super_admin_all" ON public.aula_curso
  FOR ALL USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Admin sede: can access cursos in their iglesia
CREATE POLICY "aula_curso_admin_sede_select" ON public.aula_curso
  FOR SELECT USING (
    is_admin_sede()
    AND (
      id_iglesia = get_my_tenant_id()
      OR id_ministerio IN (
        SELECT m.id_ministerio FROM ministerio m WHERE m.id_iglesia = get_my_tenant_id()
      )
    )
  );

CREATE POLICY "aula_curso_admin_sede_modify" ON public.aula_curso
  FOR INSERT, UPDATE, DELETE USING (
    is_admin_sede()
    AND id_iglesia = get_my_tenant_id()
  )
  WITH CHECK (
    is_admin_sede()
    AND id_iglesia = get_my_tenant_id()
  );

-- Course creator: can manage their own courses
CREATE POLICY "aula_curso_creator_all" ON public.aula_curso
  FOR ALL USING (id_usuario_creador = current_usuario_id())
  WITH CHECK (id_usuario_creador = current_usuario_id());

-- Lider ministerio: can read courses in their ministerios
CREATE POLICY "aula_curso_lider_select" ON public.aula_curso
  FOR SELECT USING (
    id_ministerio IN (
      SELECT m.id_ministerio FROM ministerio m
      JOIN miembro_ministerio mm ON mm.id_ministerio = m.id_ministerio
      WHERE mm.id_usuario = current_usuario_id()
        AND mm.rol_en_ministerio = 'lider'
        AND mm.fecha_salida IS NULL
    )
  );

-- Servidor inscrito: can read courses they're enrolled in
CREATE POLICY "aula_curso_servidor_enrolled" ON public.aula_curso
  FOR SELECT USING (
    id_aula_curso IN (
      SELECT id_aula_curso FROM aula_inscripcion
      WHERE id_usuario = current_usuario_id() AND activo = true
    )
  );

-- ============================================================================
-- AULA_MODULO RLS POLICIES
-- ============================================================================

-- Drop all existing policies on aula_modulo
DROP POLICY IF EXISTS "Super admin can manage all modulos" ON public.aula_modulo;
DROP POLICY IF EXISTS "Admin iglesia can manage modulos in their iglesia" ON public.aula_modulo;
DROP POLICY IF EXISTS "Lider can manage modulos in their cursos" ON public.aula_modulo;
DROP POLICY IF EXISTS "Servidor can read modulos publicados in their cursos" ON public.aula_modulo;
DROP POLICY IF EXISTS "aula_modulo super admin" ON public.aula_modulo;
DROP POLICY IF EXISTS "aula_modulo_admin_sede_all" ON public.aula_modulo;
DROP POLICY IF EXISTS "aula_modulo_select_tenant" ON public.aula_modulo;
DROP POLICY IF EXISTS "aula_modulo_insert_tenant" ON public.aula_modulo;
DROP POLICY IF EXISTS "aula_modulo_update_tenant" ON public.aula_modulo;
DROP POLICY IF EXISTS "aula_modulo_delete_tenant" ON public.aula_modulo;

-- Super admin: full access
CREATE POLICY "aula_modulo_super_admin_all" ON public.aula_modulo
  FOR ALL USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Admin sede: can access modulos in courses within their iglesia
CREATE POLICY "aula_modulo_admin_sede_select" ON public.aula_modulo
  FOR SELECT USING (
    is_admin_sede()
    AND id_aula_curso IN (
      SELECT ac.id_aula_curso FROM aula_curso ac
      WHERE ac.id_iglesia = get_my_tenant_id()
        OR ac.id_ministerio IN (
          SELECT m.id_ministerio FROM ministerio m WHERE m.id_iglesia = get_my_tenant_id()
        )
    )
  );

CREATE POLICY "aula_modulo_admin_sede_modify" ON public.aula_modulo
  FOR INSERT, UPDATE, DELETE USING (
    is_admin_sede()
    AND id_aula_curso IN (
      SELECT ac.id_aula_curso FROM aula_curso ac
      WHERE ac.id_iglesia = get_my_tenant_id()
    )
  )
  WITH CHECK (
    is_admin_sede()
    AND id_aula_curso IN (
      SELECT ac.id_aula_curso FROM aula_curso ac
      WHERE ac.id_iglesia = get_my_tenant_id()
    )
  );

-- Course creator: can manage modulos in their courses
CREATE POLICY "aula_modulo_creator_all" ON public.aula_modulo
  FOR ALL USING (
    id_aula_curso IN (
      SELECT id_aula_curso FROM aula_curso WHERE id_usuario_creador = current_usuario_id()
    )
  )
  WITH CHECK (
    id_aula_curso IN (
      SELECT id_aula_curso FROM aula_curso WHERE id_usuario_creador = current_usuario_id()
    )
  );

-- Lider ministerio: can manage modulos in courses of their ministerios
CREATE POLICY "aula_modulo_lider_all" ON public.aula_modulo
  FOR ALL USING (
    id_aula_curso IN (
      SELECT ac.id_aula_curso FROM aula_curso ac
      WHERE ac.id_ministerio IN (
        SELECT m.id_ministerio FROM ministerio m
        JOIN miembro_ministerio mm ON mm.id_ministerio = m.id_ministerio
        WHERE mm.id_usuario = current_usuario_id()
          AND mm.rol_en_ministerio = 'lider'
          AND mm.fecha_salida IS NULL
      )
    )
  )
  WITH CHECK (
    id_aula_curso IN (
      SELECT ac.id_aula_curso FROM aula_curso ac
      WHERE ac.id_ministerio IN (
        SELECT m.id_ministerio FROM ministerio m
        JOIN miembro_ministerio mm ON mm.id_ministerio = m.id_ministerio
        WHERE mm.id_usuario = current_usuario_id()
          AND mm.rol_en_ministerio = 'lider'
          AND mm.fecha_salida IS NULL
      )
    )
  );

-- Servidor inscrito: can read all modulos in courses they're enrolled in
CREATE POLICY "aula_modulo_servidor_enrolled" ON public.aula_modulo
  FOR SELECT USING (
    id_aula_curso IN (
      SELECT id_aula_curso FROM aula_inscripcion
      WHERE id_usuario = current_usuario_id() AND activo = true
    )
  );

-- ============================================================================
-- AULA_EVALUACION RLS POLICIES
-- ============================================================================

-- Drop all existing policies on aula_evaluacion if any exist
DROP POLICY IF EXISTS "Super admin can manage all evaluaciones" ON public.aula_evaluacion;
DROP POLICY IF EXISTS "Lider can manage evaluaciones in their modulos" ON public.aula_evaluacion;

-- Super admin: full access
CREATE POLICY "aula_evaluacion_super_admin_all" ON public.aula_evaluacion
  FOR ALL USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Course creator and Lider: can manage evaluaciones in their modulos
CREATE POLICY "aula_evaluacion_course_admin_all" ON public.aula_evaluacion
  FOR ALL USING (
    id_aula_modulo IN (
      SELECT am.id_aula_modulo FROM aula_modulo am
      JOIN aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_usuario_creador = current_usuario_id()
        OR ac.id_ministerio IN (
          SELECT m.id_ministerio FROM ministerio m
          JOIN miembro_ministerio mm ON mm.id_ministerio = m.id_ministerio
          WHERE mm.id_usuario = current_usuario_id()
            AND mm.rol_en_ministerio = 'lider'
            AND mm.fecha_salida IS NULL
        )
    )
  )
  WITH CHECK (
    id_aula_modulo IN (
      SELECT am.id_aula_modulo FROM aula_modulo am
      JOIN aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_usuario_creador = current_usuario_id()
        OR ac.id_ministerio IN (
          SELECT m.id_ministerio FROM ministerio m
          JOIN miembro_ministerio mm ON mm.id_ministerio = m.id_ministerio
          WHERE mm.id_usuario = current_usuario_id()
            AND mm.rol_en_ministerio = 'lider'
            AND mm.fecha_salida IS NULL
        )
    )
  );

-- Servidor: can read evaluaciones in enrolled courses
CREATE POLICY "aula_evaluacion_servidor_read" ON public.aula_evaluacion
  FOR SELECT USING (
    id_aula_modulo IN (
      SELECT am.id_aula_modulo FROM aula_modulo am
      WHERE am.id_aula_curso IN (
        SELECT id_aula_curso FROM aula_inscripcion
        WHERE id_usuario = current_usuario_id() AND activo = true
      )
    )
  );

-- ============================================================================
-- COMMENT
-- ============================================================================

COMMENT ON TABLE aula_curso IS 'Academic courses - RLS ensures user can only access courses they created, are enrolled in, or lead via ministerio';
COMMENT ON TABLE aula_modulo IS 'Course modules - RLS ensures user can only access modules in courses they have permission for';
COMMENT ON TABLE aula_evaluacion IS 'Module evaluations - RLS ensures user can only manage evaluations in modules they control';
