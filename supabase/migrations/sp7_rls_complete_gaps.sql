-- SP-7: Complete RLS Coverage — all 7 confirmed gaps

-- ============================================================
-- 1. GEOGRAPHIC TABLES — public SELECT (config data)
-- ============================================================
DROP POLICY IF EXISTS pais_select ON pais;
CREATE POLICY pais_select ON pais FOR SELECT USING (true);

DROP POLICY IF EXISTS departamento_select ON departamento;
CREATE POLICY departamento_select ON departamento FOR SELECT USING (true);

DROP POLICY IF EXISTS ciudad_select ON ciudad;
CREATE POLICY ciudad_select ON ciudad FOR SELECT USING (true);

-- ============================================================
-- 2. TAREA_ASIGNADA — tenant-scoped SELECT / INSERT / DELETE
--    Root: RLS blocked the subquery in tarea_select_tenant,
--    making the servidor assignment path return empty.
-- ============================================================
DROP POLICY IF EXISTS tarea_asignada_select ON tarea_asignada;
CREATE POLICY tarea_asignada_select ON tarea_asignada
  FOR SELECT USING (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
    OR (is_admin_iglesia() AND id_tarea IN (
      SELECT t.id_tarea FROM tarea t
      JOIN ministerio m ON m.id_ministerio = t.id_ministerio
      JOIN sede s ON s.id_sede = m.id_sede
      WHERE s.id_iglesia = get_my_tenant_id()
    ))
    OR (get_my_role() = 'lider' AND id_tarea IN (
      SELECT id_tarea FROM tarea
      WHERE id_ministerio IN (SELECT id FROM get_my_ministerios())
    ))
  );

DROP POLICY IF EXISTS tarea_asignada_insert ON tarea_asignada;
CREATE POLICY tarea_asignada_insert ON tarea_asignada
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (is_admin_iglesia() AND id_tarea IN (
      SELECT t.id_tarea FROM tarea t
      JOIN ministerio m ON m.id_ministerio = t.id_ministerio
      JOIN sede s ON s.id_sede = m.id_sede
      WHERE s.id_iglesia = get_my_tenant_id()
    ))
    OR (get_my_role() = 'lider' AND id_tarea IN (
      SELECT id_tarea FROM tarea
      WHERE id_ministerio IN (SELECT id FROM get_my_ministerios())
    ))
  );

DROP POLICY IF EXISTS tarea_asignada_delete ON tarea_asignada;
CREATE POLICY tarea_asignada_delete ON tarea_asignada
  FOR DELETE USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_tarea IN (
      SELECT t.id_tarea FROM tarea t
      JOIN ministerio m ON m.id_ministerio = t.id_ministerio
      JOIN sede s ON s.id_sede = m.id_sede
      WHERE s.id_iglesia = get_my_tenant_id()
    ))
    OR (get_my_role() = 'lider' AND id_tarea IN (
      SELECT id_tarea FROM tarea
      WHERE id_ministerio IN (SELECT id FROM get_my_ministerios())
    ))
  );

-- ============================================================
-- 3. TAREA_EVIDENCIA — tenant-scoped SELECT / INSERT
--    Links via id_tarea_asignada (not id_tarea directly).
-- ============================================================
DROP POLICY IF EXISTS tarea_evidencia_select ON tarea_evidencia;
CREATE POLICY tarea_evidencia_select ON tarea_evidencia
  FOR SELECT USING (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
    OR (is_admin_iglesia() AND id_tarea_asignada IN (
      SELECT ta.id_tarea_asignada FROM tarea_asignada ta
      JOIN tarea t ON t.id_tarea = ta.id_tarea
      JOIN ministerio m ON m.id_ministerio = t.id_ministerio
      JOIN sede s ON s.id_sede = m.id_sede
      WHERE s.id_iglesia = get_my_tenant_id()
    ))
    OR (get_my_role() = 'lider' AND id_tarea_asignada IN (
      SELECT ta.id_tarea_asignada FROM tarea_asignada ta
      JOIN tarea t ON t.id_tarea = ta.id_tarea
      WHERE t.id_ministerio IN (SELECT id FROM get_my_ministerios())
    ))
  );

DROP POLICY IF EXISTS tarea_evidencia_insert ON tarea_evidencia;
CREATE POLICY tarea_evidencia_insert ON tarea_evidencia
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR id_usuario = get_my_usuario_id()
  );

-- ============================================================
-- 4. AULA_MODULO_ARCHIVO — tenant-scoped SELECT + write
-- ============================================================
DROP POLICY IF EXISTS aula_modulo_archivo_select ON aula_modulo_archivo;
CREATE POLICY aula_modulo_archivo_select ON aula_modulo_archivo
  FOR SELECT USING (
    is_super_admin()
    OR id_aula_modulo IN (
      SELECT am.id_aula_modulo FROM aula_modulo am
      JOIN aula_curso c ON c.id_aula_curso = am.id_aula_curso
      WHERE (c.id_iglesia IS NOT NULL AND c.id_iglesia = get_my_tenant_id())
         OR (c.id_ministerio IS NOT NULL AND c.id_ministerio IN (SELECT id FROM get_my_ministerios()))
    )
  );

DROP POLICY IF EXISTS aula_modulo_archivo_write ON aula_modulo_archivo;
CREATE POLICY aula_modulo_archivo_write ON aula_modulo_archivo
  FOR ALL USING (
    is_super_admin()
    OR (get_my_role() IN ('admin_iglesia', 'lider') AND id_aula_modulo IN (
      SELECT am.id_aula_modulo FROM aula_modulo am
      JOIN aula_curso c ON c.id_aula_curso = am.id_aula_curso
      WHERE (c.id_iglesia IS NOT NULL AND c.id_iglesia = get_my_tenant_id())
         OR (c.id_ministerio IS NOT NULL AND c.id_ministerio IN (SELECT id FROM get_my_ministerios()))
    ))
  );

-- ============================================================
-- 5. AULA_MODULO_ENLACE — tenant-scoped SELECT + write
-- ============================================================
DROP POLICY IF EXISTS aula_modulo_enlace_select ON aula_modulo_enlace;
CREATE POLICY aula_modulo_enlace_select ON aula_modulo_enlace
  FOR SELECT USING (
    is_super_admin()
    OR id_aula_modulo IN (
      SELECT am.id_aula_modulo FROM aula_modulo am
      JOIN aula_curso c ON c.id_aula_curso = am.id_aula_curso
      WHERE (c.id_iglesia IS NOT NULL AND c.id_iglesia = get_my_tenant_id())
         OR (c.id_ministerio IS NOT NULL AND c.id_ministerio IN (SELECT id FROM get_my_ministerios()))
    )
  );

DROP POLICY IF EXISTS aula_modulo_enlace_write ON aula_modulo_enlace;
CREATE POLICY aula_modulo_enlace_write ON aula_modulo_enlace
  FOR ALL USING (
    is_super_admin()
    OR (get_my_role() IN ('admin_iglesia', 'lider') AND id_aula_modulo IN (
      SELECT am.id_aula_modulo FROM aula_modulo am
      JOIN aula_curso c ON c.id_aula_curso = am.id_aula_curso
      WHERE (c.id_iglesia IS NOT NULL AND c.id_iglesia = get_my_tenant_id())
         OR (c.id_ministerio IS NOT NULL AND c.id_ministerio IN (SELECT id FROM get_my_ministerios()))
    ))
  );

-- ============================================================
-- 6. IGLESIA_PASTOR — SELECT for tenant, write for admin
-- ============================================================
DROP POLICY IF EXISTS iglesia_pastor_select ON iglesia_pastor;
CREATE POLICY iglesia_pastor_select ON iglesia_pastor
  FOR SELECT USING (
    is_super_admin()
    OR id_iglesia = get_my_tenant_id()
  );

DROP POLICY IF EXISTS iglesia_pastor_write ON iglesia_pastor;
CREATE POLICY iglesia_pastor_write ON iglesia_pastor
  FOR ALL USING (
    is_super_admin()
    OR (is_admin_iglesia() AND id_iglesia = get_my_tenant_id())
  );

-- ============================================================
-- 7. SEDE_PASTOR — SELECT for tenant, write for admin
-- ============================================================
DROP POLICY IF EXISTS sede_pastor_select ON sede_pastor;
CREATE POLICY sede_pastor_select ON sede_pastor
  FOR SELECT USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM sede s
      WHERE s.id_sede = sede_pastor.id_sede
        AND s.id_iglesia = get_my_tenant_id()
    )
  );

DROP POLICY IF EXISTS sede_pastor_write ON sede_pastor;
CREATE POLICY sede_pastor_write ON sede_pastor
  FOR ALL USING (
    is_super_admin()
    OR (is_admin_iglesia() AND EXISTS (
      SELECT 1 FROM sede s
      WHERE s.id_sede = sede_pastor.id_sede
        AND s.id_iglesia = get_my_tenant_id()
    ))
  );

