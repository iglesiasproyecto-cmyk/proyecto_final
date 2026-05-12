-- SP-6: RLS Security Hardening

-- PART 1: Drop QUAL:true data-leak policies
DROP POLICY IF EXISTS "iglesia manage super admin" ON iglesia;
DROP POLICY IF EXISTS "ministerio super admin" ON ministerio;
DROP POLICY IF EXISTS "pastor super admin" ON pastor;
DROP POLICY IF EXISTS "usuario super admin" ON usuario;

-- PART 2: aula_modulo
DROP POLICY IF EXISTS "aula_modulo super admin" ON aula_modulo;
DROP POLICY IF EXISTS aula_modulo_select ON aula_modulo;
DROP POLICY IF EXISTS aula_modulo_write ON aula_modulo;

CREATE POLICY aula_modulo_select ON aula_modulo
  FOR SELECT USING (
    is_super_admin()
    OR id_aula_curso IN (
      SELECT c.id_aula_curso FROM aula_curso c
      WHERE
        (c.id_iglesia IS NOT NULL AND c.id_iglesia = get_my_tenant_id())
        OR (c.id_ministerio IS NOT NULL AND c.id_ministerio IN (
          SELECT id FROM get_my_ministerios()
        ))
    )
  );

CREATE POLICY aula_modulo_write ON aula_modulo
  FOR ALL USING (
    is_super_admin()
    OR (
      get_my_role() IN ('admin_iglesia', 'lider')
      AND id_aula_curso IN (
        SELECT c.id_aula_curso FROM aula_curso c
        WHERE
          (c.id_iglesia IS NOT NULL AND c.id_iglesia = get_my_tenant_id())
          OR (c.id_ministerio IS NOT NULL AND c.id_ministerio IN (
            SELECT id FROM get_my_ministerios()
          ))
      )
    )
  );

-- PART 3: aula_inscripcion
DROP POLICY IF EXISTS "aula_inscripcion super admin" ON aula_inscripcion;
DROP POLICY IF EXISTS aula_inscripcion_select ON aula_inscripcion;
DROP POLICY IF EXISTS aula_inscripcion_insert ON aula_inscripcion;
DROP POLICY IF EXISTS aula_inscripcion_update ON aula_inscripcion;

CREATE POLICY aula_inscripcion_select ON aula_inscripcion
  FOR SELECT USING (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
    OR (
      get_my_role() IN ('admin_iglesia', 'lider')
      AND id_aula_curso IN (
        SELECT c.id_aula_curso FROM aula_curso c
        WHERE
          (c.id_iglesia IS NOT NULL AND c.id_iglesia = get_my_tenant_id())
          OR (c.id_ministerio IS NOT NULL AND c.id_ministerio IN (
            SELECT id FROM get_my_ministerios()
          ))
      )
    )
  );

CREATE POLICY aula_inscripcion_insert ON aula_inscripcion
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
    OR get_my_role() IN ('admin_iglesia', 'lider')
  );

CREATE POLICY aula_inscripcion_update ON aula_inscripcion
  FOR UPDATE USING (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
    OR get_my_role() IN ('admin_iglesia', 'lider')
  );

-- PART 4: aula_intento_evaluacion
DROP POLICY IF EXISTS "aula_intento_evaluacion super admin" ON aula_intento_evaluacion;
DROP POLICY IF EXISTS aula_intento_evaluacion_select ON aula_intento_evaluacion;
DROP POLICY IF EXISTS aula_intento_evaluacion_insert ON aula_intento_evaluacion;
DROP POLICY IF EXISTS aula_intento_evaluacion_update ON aula_intento_evaluacion;

CREATE POLICY aula_intento_evaluacion_select ON aula_intento_evaluacion
  FOR SELECT USING (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
    OR get_my_role() IN ('admin_iglesia', 'lider')
  );

CREATE POLICY aula_intento_evaluacion_insert ON aula_intento_evaluacion
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
  );

CREATE POLICY aula_intento_evaluacion_update ON aula_intento_evaluacion
  FOR UPDATE USING (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
  );

-- PART 5: aula_respuesta
DROP POLICY IF EXISTS "aula_respuesta super admin" ON aula_respuesta;
DROP POLICY IF EXISTS aula_respuesta_select ON aula_respuesta;
DROP POLICY IF EXISTS aula_respuesta_insert ON aula_respuesta;

CREATE POLICY aula_respuesta_select ON aula_respuesta
  FOR SELECT USING (
    is_super_admin()
    OR id_aula_intento_evaluacion IN (
      SELECT ie.id_aula_intento_evaluacion FROM aula_intento_evaluacion ie
      WHERE ie.id_usuario = get_my_usuario_id()
    )
    OR get_my_role() IN ('admin_iglesia', 'lider')
  );

CREATE POLICY aula_respuesta_insert ON aula_respuesta
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR id_aula_intento_evaluacion IN (
      SELECT ie.id_aula_intento_evaluacion FROM aula_intento_evaluacion ie
      WHERE ie.id_usuario = get_my_usuario_id()
    )
  );

-- PART 6: aula_progreso_actividad
DROP POLICY IF EXISTS "aula_progreso_actividad super admin" ON aula_progreso_actividad;
DROP POLICY IF EXISTS aula_progreso_actividad_select ON aula_progreso_actividad;
DROP POLICY IF EXISTS aula_progreso_actividad_write ON aula_progreso_actividad;

CREATE POLICY aula_progreso_actividad_select ON aula_progreso_actividad
  FOR SELECT USING (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
    OR get_my_role() IN ('admin_iglesia', 'lider')
  );

CREATE POLICY aula_progreso_actividad_write ON aula_progreso_actividad
  FOR ALL USING (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
  );

-- PART 7: aula_certificado
DROP POLICY IF EXISTS "aula_certificado super admin" ON aula_certificado;
DROP POLICY IF EXISTS aula_certificado_select ON aula_certificado;
DROP POLICY IF EXISTS aula_certificado_insert ON aula_certificado;

CREATE POLICY aula_certificado_select ON aula_certificado
  FOR SELECT USING (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
    OR get_my_role() IN ('admin_iglesia', 'lider')
  );

CREATE POLICY aula_certificado_insert ON aula_certificado
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR get_my_role() IN ('admin_iglesia', 'lider')
  );

-- PART 8: aula_retroalimentacion
DROP POLICY IF EXISTS "aula_retroalimentacion super admin" ON aula_retroalimentacion;
DROP POLICY IF EXISTS aula_retroalimentacion_select ON aula_retroalimentacion;
DROP POLICY IF EXISTS aula_retroalimentacion_write ON aula_retroalimentacion;

CREATE POLICY aula_retroalimentacion_select ON aula_retroalimentacion
  FOR SELECT USING (
    is_super_admin()
    OR id_usuario_lider = get_my_usuario_id()
    OR id_usuario_servidor = get_my_usuario_id()
  );

CREATE POLICY aula_retroalimentacion_write ON aula_retroalimentacion
  FOR ALL USING (
    is_super_admin()
    OR id_usuario_lider = get_my_usuario_id()
    OR get_my_role() = 'admin_iglesia'
  );

