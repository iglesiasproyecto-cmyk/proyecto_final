-- supabase/migrations/20260613000000_disponibilidad_table.sql

CREATE TABLE IF NOT EXISTS disponibilidad (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id    BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN ('fecha_especifica', 'recurrente')),
  fecha         DATE,
  fecha_fin     DATE,
  patron        JSONB,
  nota          TEXT,
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disponibilidad_usuario_id ON disponibilidad(usuario_id);
CREATE INDEX IF NOT EXISTS idx_disponibilidad_fecha ON disponibilidad(fecha) WHERE tipo = 'fecha_especifica';
CREATE INDEX IF NOT EXISTS idx_disponibilidad_activo ON disponibilidad(activo) WHERE activo = true;

-- Trigger updated_at
CREATE OR REPLACE TRIGGER set_disponibilidad_updated_at
  BEFORE UPDATE ON disponibilidad
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- RLS
ALTER TABLE disponibilidad ENABLE ROW LEVEL SECURITY;

-- Lectura: propio usuario
CREATE POLICY "disponibilidad_select_own"
  ON disponibilidad FOR SELECT
  TO authenticated
  USING (usuario_id = public.current_usuario_id());

-- Lectura: líder ve miembros de su ministerio
CREATE POLICY "disponibilidad_select_lider"
  ON disponibilidad FOR SELECT
  TO authenticated
  USING (
    public.is_lider()
    AND EXISTS (
      SELECT 1
      FROM miembro_ministerio mm
      JOIN miembro_ministerio mm_lider ON mm_lider.id_ministerio = mm.id_ministerio
      WHERE mm.id_usuario = disponibilidad.usuario_id
        AND mm_lider.id_usuario = public.current_usuario_id()
        AND mm_lider.rol_en_ministerio = 'lider'
        AND mm_lider.fecha_salida IS NULL
        AND mm.fecha_salida IS NULL
    )
  );

-- Lectura: admin_iglesia, admin_sede y super_admin ven todo
CREATE POLICY "disponibilidad_select_admin"
  ON disponibilidad FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_admin_iglesia()
    OR public.is_admin_sede()
  );

-- Insertar: solo propio
CREATE POLICY "disponibilidad_insert_own"
  ON disponibilidad FOR INSERT
  TO authenticated
  WITH CHECK (usuario_id = public.current_usuario_id());

-- Actualizar: solo propio
CREATE POLICY "disponibilidad_update_own"
  ON disponibilidad FOR UPDATE
  TO authenticated
  USING (usuario_id = public.current_usuario_id());

-- Eliminar: solo propio
CREATE POLICY "disponibilidad_delete_own"
  ON disponibilidad FOR DELETE
  TO authenticated
  USING (usuario_id = public.current_usuario_id());
