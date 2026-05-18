-- Remediation: Close RLS gaps for Administrador de Sede
--
-- Audit 2026-05-18 found 18 tables with missing or improperly-scoped policies.
-- See CLAUDE.md anchored summary for the full audit report.
--
-- Fixes applied:
--   1. Extend can_manage_ministerio_formacion_scope() → admin_sede via get_my_sedes()
--   2. Replace sp9-era admin_sede aula policies (tenant-scoped) with sede-scoped
--      using can_manage_ministerio() - covers aula_inscripcion, aula_modulo_archivo,
--      aula_modulo_enlace, aula_progreso_actividad
--   3. Add admin_sede policies for aula_actividad, aula_evaluacion, aula_certificado,
--      aula_opcion, aula_pregunta
--   4. Add admin_sede UPDATE policy for evento_ministerio
--   5. Add admin_sede policies for tarea child tables (aprobacion, checklist,
--      comentario, evidencia, historial)

BEGIN;

-- ════════════════════════════════════════════════════════════════════
-- 1.  can_manage_ministerio_formacion_scope — add admin_sede branch
-- ════════════════════════════════════════════════════════════════════
-- This single change fixes: curso, modulo, proceso_asignado_curso,
-- avance_modulo (all their "Scoped" policies delegate to this function).

CREATE OR REPLACE FUNCTION public.can_manage_ministerio_formacion_scope(target_ministerio_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin()
    OR public.is_admin_of_iglesia(public.get_iglesia_for_ministerio(target_ministerio_id))
    OR public.is_lider_of_ministerio(target_ministerio_id)
    OR (
      public.is_admin_sede()
      AND NOT public.is_admin_iglesia()
      AND EXISTS (
        SELECT 1
        FROM public.ministerio m
        WHERE m.id_ministerio = target_ministerio_id
          AND m.id_sede IN (SELECT id FROM public.get_my_sedes())
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_ministerio_formacion_scope(bigint) TO authenticated;

-- ════════════════════════════════════════════════════════════════════
-- 2.  Replace sp9 admin_sede policies (tenant-scoped → sede-scoped)
-- ════════════════════════════════════════════════════════════════════
-- These had is_admin_sede() + get_my_tenant_id() — wrong scope.
-- Now use is_admin_sede() AND NOT is_admin_iglesia()
-- + can_manage_ministerio() so they only manage cursos in their sedes.

-- 2a. aula_inscripcion

DROP POLICY IF EXISTS aula_inscripcion_admin_sede_all ON public.aula_inscripcion;

CREATE POLICY aula_inscripcion_admin_sede_select ON public.aula_inscripcion
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_curso IN (
      SELECT ac.id_aula_curso
      FROM public.aula_curso ac
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

CREATE POLICY aula_inscripcion_admin_sede_insert ON public.aula_inscripcion
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_curso IN (
      SELECT ac.id_aula_curso
      FROM public.aula_curso ac
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

CREATE POLICY aula_inscripcion_admin_sede_update ON public.aula_inscripcion
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_curso IN (
      SELECT ac.id_aula_curso
      FROM public.aula_curso ac
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  )
  WITH CHECK (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_curso IN (
      SELECT ac.id_aula_curso
      FROM public.aula_curso ac
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

CREATE POLICY aula_inscripcion_admin_sede_delete ON public.aula_inscripcion
  FOR DELETE TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_curso IN (
      SELECT ac.id_aula_curso
      FROM public.aula_curso ac
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

-- 2b. aula_modulo_archivo

DROP POLICY IF EXISTS aula_modulo_archivo_admin_sede_all ON public.aula_modulo_archivo;

CREATE POLICY aula_modulo_archivo_admin_sede_select ON public.aula_modulo_archivo
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_modulo IN (
      SELECT am.id_aula_modulo
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

CREATE POLICY aula_modulo_archivo_admin_sede_insert ON public.aula_modulo_archivo
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_modulo IN (
      SELECT am.id_aula_modulo
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

CREATE POLICY aula_modulo_archivo_admin_sede_update ON public.aula_modulo_archivo
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_modulo IN (
      SELECT am.id_aula_modulo
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  )
  WITH CHECK (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_modulo IN (
      SELECT am.id_aula_modulo
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

CREATE POLICY aula_modulo_archivo_admin_sede_delete ON public.aula_modulo_archivo
  FOR DELETE TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_modulo IN (
      SELECT am.id_aula_modulo
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

-- 2c. aula_modulo_enlace

DROP POLICY IF EXISTS aula_modulo_enlace_admin_sede_all ON public.aula_modulo_enlace;

CREATE POLICY aula_modulo_enlace_admin_sede_select ON public.aula_modulo_enlace
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_modulo IN (
      SELECT am.id_aula_modulo
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

CREATE POLICY aula_modulo_enlace_admin_sede_insert ON public.aula_modulo_enlace
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_modulo IN (
      SELECT am.id_aula_modulo
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

CREATE POLICY aula_modulo_enlace_admin_sede_update ON public.aula_modulo_enlace
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_modulo IN (
      SELECT am.id_aula_modulo
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  )
  WITH CHECK (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_modulo IN (
      SELECT am.id_aula_modulo
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

CREATE POLICY aula_modulo_enlace_admin_sede_delete ON public.aula_modulo_enlace
  FOR DELETE TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_modulo IN (
      SELECT am.id_aula_modulo
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

-- 2d. aula_progreso_actividad

DROP POLICY IF EXISTS aula_progreso_actividad_admin_sede_all ON public.aula_progreso_actividad;

CREATE POLICY aula_progreso_actividad_admin_sede_select ON public.aula_progreso_actividad
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_actividad IN (
      SELECT aa.id_aula_actividad
      FROM public.aula_actividad aa
      JOIN public.aula_modulo am ON am.id_aula_modulo = aa.id_aula_modulo
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

CREATE POLICY aula_progreso_actividad_admin_sede_insert ON public.aula_progreso_actividad
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_actividad IN (
      SELECT aa.id_aula_actividad
      FROM public.aula_actividad aa
      JOIN public.aula_modulo am ON am.id_aula_modulo = aa.id_aula_modulo
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

CREATE POLICY aula_progreso_actividad_admin_sede_update ON public.aula_progreso_actividad
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_actividad IN (
      SELECT aa.id_aula_actividad
      FROM public.aula_actividad aa
      JOIN public.aula_modulo am ON am.id_aula_modulo = aa.id_aula_modulo
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  )
  WITH CHECK (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_actividad IN (
      SELECT aa.id_aula_actividad
      FROM public.aula_actividad aa
      JOIN public.aula_modulo am ON am.id_aula_modulo = aa.id_aula_modulo
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

CREATE POLICY aula_progreso_actividad_admin_sede_delete ON public.aula_progreso_actividad
  FOR DELETE TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_actividad IN (
      SELECT aa.id_aula_actividad
      FROM public.aula_actividad aa
      JOIN public.aula_modulo am ON am.id_aula_modulo = aa.id_aula_modulo
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

-- ════════════════════════════════════════════════════════════════════
-- 3.  New admin_sede policies for aula tables missing them entirely
-- ════════════════════════════════════════════════════════════════════

-- 3a. aula_actividad

CREATE POLICY aula_actividad_admin_sede_select ON public.aula_actividad
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_modulo IN (
      SELECT am.id_aula_modulo
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

CREATE POLICY aula_actividad_admin_sede_all ON public.aula_actividad
  FOR ALL TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_modulo IN (
      SELECT am.id_aula_modulo
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  )
  WITH CHECK (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_modulo IN (
      SELECT am.id_aula_modulo
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

-- 3b. aula_evaluacion

CREATE POLICY aula_evaluacion_admin_sede_select ON public.aula_evaluacion
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_modulo IN (
      SELECT am.id_aula_modulo
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

CREATE POLICY aula_evaluacion_admin_sede_all ON public.aula_evaluacion
  FOR ALL TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_modulo IN (
      SELECT am.id_aula_modulo
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  )
  WITH CHECK (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_modulo IN (
      SELECT am.id_aula_modulo
      FROM public.aula_modulo am
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

-- 3c. aula_certificado (INSERT + SELECT; no UPDATE/DELETE needed)

CREATE POLICY aula_certificado_admin_sede_insert ON public.aula_certificado
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_curso IN (
      SELECT ac.id_aula_curso
      FROM public.aula_curso ac
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

CREATE POLICY aula_certificado_admin_sede_select ON public.aula_certificado
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_curso IN (
      SELECT ac.id_aula_curso
      FROM public.aula_curso ac
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

-- 3d. aula_opcion (via pregunta → evaluacion → modulo → curso → ministerio)

CREATE POLICY aula_opcion_admin_sede_select ON public.aula_opcion
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_pregunta IN (
      SELECT ap.id_aula_pregunta
      FROM public.aula_pregunta ap
      JOIN public.aula_evaluacion ae ON ae.id_aula_evaluacion = ap.id_aula_evaluacion
      JOIN public.aula_modulo am ON am.id_aula_modulo = ae.id_aula_modulo
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

CREATE POLICY aula_opcion_admin_sede_all ON public.aula_opcion
  FOR ALL TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_pregunta IN (
      SELECT ap.id_aula_pregunta
      FROM public.aula_pregunta ap
      JOIN public.aula_evaluacion ae ON ae.id_aula_evaluacion = ap.id_aula_evaluacion
      JOIN public.aula_modulo am ON am.id_aula_modulo = ae.id_aula_modulo
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  )
  WITH CHECK (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_pregunta IN (
      SELECT ap.id_aula_pregunta
      FROM public.aula_pregunta ap
      JOIN public.aula_evaluacion ae ON ae.id_aula_evaluacion = ap.id_aula_evaluacion
      JOIN public.aula_modulo am ON am.id_aula_modulo = ae.id_aula_modulo
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

-- 3e. aula_pregunta

CREATE POLICY aula_pregunta_admin_sede_select ON public.aula_pregunta
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_evaluacion IN (
      SELECT ae.id_aula_evaluacion
      FROM public.aula_evaluacion ae
      JOIN public.aula_modulo am ON am.id_aula_modulo = ae.id_aula_modulo
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

CREATE POLICY aula_pregunta_admin_sede_all ON public.aula_pregunta
  FOR ALL TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_evaluacion IN (
      SELECT ae.id_aula_evaluacion
      FROM public.aula_evaluacion ae
      JOIN public.aula_modulo am ON am.id_aula_modulo = ae.id_aula_modulo
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  )
  WITH CHECK (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_aula_evaluacion IN (
      SELECT ae.id_aula_evaluacion
      FROM public.aula_evaluacion ae
      JOIN public.aula_modulo am ON am.id_aula_modulo = ae.id_aula_modulo
      JOIN public.aula_curso ac ON ac.id_aula_curso = am.id_aula_curso
      WHERE ac.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(ac.id_ministerio)
    )
  );

-- ════════════════════════════════════════════════════════════════════
-- 4.  evento_ministerio — add UPDATE policy for admin_sede
-- ════════════════════════════════════════════════════════════════════
-- SELECT, INSERT, DELETE already cover admin_sede.

CREATE POLICY evento_ministerio_admin_sede_update ON public.evento_ministerio
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_ministerio IN (
      SELECT m.id_ministerio
      FROM public.ministerio m
      WHERE m.id_sede IN (SELECT id FROM public.get_my_sedes())
    )
  )
  WITH CHECK (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_ministerio IN (
      SELECT m.id_ministerio
      FROM public.ministerio m
      WHERE m.id_sede IN (SELECT id FROM public.get_my_sedes())
    )
  );

-- ════════════════════════════════════════════════════════════════════
-- 5.  Tarea child tables — add admin_sede policies
-- ════════════════════════════════════════════════════════════════════
-- All scope through tarea → ministerio → can_manage_ministerio().

-- 5a. tarea_aprobacion

CREATE POLICY tarea_aprobacion_admin_sede_select ON public.tarea_aprobacion
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_tarea IN (
      SELECT t.id_tarea
      FROM public.tarea t
      WHERE t.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(t.id_ministerio)
    )
  );

CREATE POLICY tarea_aprobacion_admin_sede_insert ON public.tarea_aprobacion
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_usuario = public.get_my_usuario_id()
    AND id_tarea IN (
      SELECT t.id_tarea
      FROM public.tarea t
      WHERE t.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(t.id_ministerio)
    )
  );

-- 5b. tarea_checklist

CREATE POLICY tarea_checklist_admin_sede_select ON public.tarea_checklist
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_tarea IN (
      SELECT t.id_tarea
      FROM public.tarea t
      WHERE t.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(t.id_ministerio)
    )
  );

CREATE POLICY tarea_checklist_admin_sede_insert ON public.tarea_checklist
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_tarea IN (
      SELECT t.id_tarea
      FROM public.tarea t
      WHERE t.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(t.id_ministerio)
    )
  );

CREATE POLICY tarea_checklist_admin_sede_update ON public.tarea_checklist
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_tarea IN (
      SELECT t.id_tarea
      FROM public.tarea t
      WHERE t.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(t.id_ministerio)
    )
  )
  WITH CHECK (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_tarea IN (
      SELECT t.id_tarea
      FROM public.tarea t
      WHERE t.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(t.id_ministerio)
    )
  );

CREATE POLICY tarea_checklist_admin_sede_delete ON public.tarea_checklist
  FOR DELETE TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_tarea IN (
      SELECT t.id_tarea
      FROM public.tarea t
      WHERE t.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(t.id_ministerio)
    )
  );

-- 5c. tarea_comentario

CREATE POLICY tarea_comentario_admin_sede_select ON public.tarea_comentario
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_tarea IN (
      SELECT t.id_tarea
      FROM public.tarea t
      WHERE t.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(t.id_ministerio)
    )
  );

CREATE POLICY tarea_comentario_admin_sede_insert ON public.tarea_comentario
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_usuario = public.get_my_usuario_id()
    AND id_tarea IN (
      SELECT t.id_tarea
      FROM public.tarea t
      WHERE t.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(t.id_ministerio)
    )
  );

-- 5d. tarea_evidencia

CREATE POLICY tarea_evidencia_admin_sede_select ON public.tarea_evidencia
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_tarea_asignada IN (
      SELECT ta.id_tarea_asignada
      FROM public.tarea_asignada ta
      JOIN public.tarea t ON t.id_tarea = ta.id_tarea
      WHERE t.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(t.id_ministerio)
    )
  );

-- 5e. tarea_historial

CREATE POLICY tarea_historial_admin_sede_select ON public.tarea_historial
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sede()
    AND NOT public.is_admin_iglesia()
    AND id_tarea IN (
      SELECT t.id_tarea
      FROM public.tarea t
      WHERE t.id_ministerio IS NOT NULL
        AND public.can_manage_ministerio(t.id_ministerio)
    )
  );

COMMIT;
