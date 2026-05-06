-- Add super admin policies for all tables with RLS enabled but no policies
-- This ensures super admin can access all data

-- audit_log
CREATE POLICY "audit_log super admin" ON audit_log FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- aula_certificado
CREATE POLICY "aula_certificado super admin" ON aula_certificado FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- aula_curso
CREATE POLICY "aula_curso super admin" ON aula_curso FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- aula_inscripcion
CREATE POLICY "aula_inscripcion super admin" ON aula_inscripcion FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- aula_intento_evaluacion
CREATE POLICY "aula_intento_evaluacion super admin" ON aula_intento_evaluacion FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- aula_modulo
CREATE POLICY "aula_modulo super admin" ON aula_modulo FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- aula_modulo_archivo
CREATE POLICY "aula_modulo_archivo super admin" ON aula_modulo_archivo FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- aula_modulo_enlace
CREATE POLICY "aula_modulo_enlace super admin" ON aula_modulo_enlace FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- aula_progreso_actividad
CREATE POLICY "aula_progreso_actividad super admin" ON aula_progreso_actividad FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- aula_respuesta
CREATE POLICY "aula_respuesta super admin" ON aula_respuesta FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- aula_retroalimentacion
CREATE POLICY "aula_retroalimentacion super admin" ON aula_retroalimentacion FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ciudad
CREATE POLICY "ciudad super admin" ON ciudad FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- departamento
CREATE POLICY "departamento super admin" ON departamento FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- evento
CREATE POLICY "evento super admin" ON evento FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- iglesia_pastor
CREATE POLICY "iglesia_pastor super admin" ON iglesia_pastor FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- notificacion
CREATE POLICY "notificacion super admin" ON notificacion FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- pais
CREATE POLICY "pais super admin" ON pais FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- pastor
CREATE POLICY "pastor super admin" ON pastor FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- rol
CREATE POLICY "rol super admin" ON rol FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- sede_pastor
CREATE POLICY "sede_pastor super admin" ON sede_pastor FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- tarea
CREATE POLICY "tarea super admin" ON tarea FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- tarea_asignada
CREATE POLICY "tarea_asignada super admin" ON tarea_asignada FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- tarea_evidencia
CREATE POLICY "tarea_evidencia super admin" ON tarea_evidencia FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- tipo_evento
CREATE POLICY "tipo_evento super admin" ON tipo_evento FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- usuario
CREATE POLICY "usuario super admin" ON usuario FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- usuario_rol
CREATE POLICY "usuario_rol super admin" ON usuario_rol FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());