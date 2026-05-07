-- Create hoja_de_vida table for user CVs
CREATE TABLE IF NOT EXISTS hoja_de_vida (
  id_hoja_de_vida BIGSERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL UNIQUE,
  titulo_profesional TEXT,
  experiencia_laboral TEXT,
  habilidades JSONB DEFAULT '[]'::jsonb,
  resumen_profesional TEXT,
  foto_perfil_url TEXT,
  formacion_academica JSONB DEFAULT '[]'::jsonb,
  otros_datos JSONB DEFAULT '{}'::jsonb,
  completa BOOLEAN DEFAULT FALSE,
  completada_en TIMESTAMP WITH TIME ZONE,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX idx_hoja_de_vida_id_usuario ON hoja_de_vida(id_usuario);

-- Enable RLS
ALTER TABLE hoja_de_vida ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hoja_de_vida
-- Usuarios pueden ver su propia hoja de vida
CREATE POLICY "Usuarios ven su propia hoja de vida"
  ON hoja_de_vida FOR SELECT
  USING (id_usuario = (SELECT auth.uid()::text::integer));

-- Super admin y admin iglesia pueden ver todas las hojas de vida de su iglesia
CREATE POLICY "Admins ven hojas de vida de su iglesia"
  ON hoja_de_vida FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuario_rol ur
      JOIN usuario u ON u.id_usuario = ur.id_usuario
      WHERE u.auth_user_id = auth.uid()
      AND ur.id_rol IN (1, 2) -- super_admin, admin_iglesia
      AND ur.id_iglesia = (
        SELECT COALESCE(id_iglesia, (SELECT id_iglesia FROM usuario_rol WHERE id_usuario = hoja_de_vida.id_usuario LIMIT 1))
        FROM usuario_rol WHERE id_usuario = hoja_de_vida.id_usuario LIMIT 1
      )
    )
  );

-- Líderes pueden ver hojas de vida de usuarios en sus ministerios
CREATE POLICY "Líderes ven hojas de vida de su ministerio"
  ON hoja_de_vida FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ministerio m
      JOIN miembro_ministerio mm ON mm.id_ministerio = m.id_ministerio
      WHERE mm.id_usuario = hoja_de_vida.id_usuario
      AND m.id_usuario_creador = (SELECT auth.uid()::text::integer)
    )
  );

-- Usuarios pueden actualizar su propia hoja de vida
CREATE POLICY "Usuarios actualizan su propia hoja de vida"
  ON hoja_de_vida FOR UPDATE
  USING (id_usuario = (SELECT auth.uid()::text::integer))
  WITH CHECK (id_usuario = (SELECT auth.uid()::text::integer));

-- Usuarios pueden insertar su propia hoja de vida
CREATE POLICY "Usuarios crean su propia hoja de vida"
  ON hoja_de_vida FOR INSERT
  WITH CHECK (id_usuario = (SELECT auth.uid()::text::integer));

-- Trigger para actualizar timestamp
CREATE OR REPLACE FUNCTION update_hoja_de_vida_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_hoja_de_vida_timestamp
BEFORE UPDATE ON hoja_de_vida
FOR EACH ROW
EXECUTE FUNCTION update_hoja_de_vida_timestamp();

-- Create RPC function to get hoja de vida with certificados
CREATE OR REPLACE FUNCTION get_hoja_de_vida_completa(p_id_usuario INTEGER)
RETURNS TABLE (
  id_hoja_de_vida BIGINT,
  id_usuario INTEGER,
  titulo_profesional TEXT,
  experiencia_laboral TEXT,
  habilidades JSONB,
  resumen_profesional TEXT,
  foto_perfil_url TEXT,
  formacion_academica JSONB,
  otros_datos JSONB,
  completa BOOLEAN,
  completada_en TIMESTAMP WITH TIME ZONE,
  usuario_nombres TEXT,
  usuario_apellidos TEXT,
  usuario_correo TEXT,
  certificados JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    hdv.id_hoja_de_vida,
    hdv.id_usuario,
    hdv.titulo_profesional,
    hdv.experiencia_laboral,
    hdv.habilidades,
    hdv.resumen_profesional,
    hdv.foto_perfil_url,
    hdv.formacion_academica,
    hdv.otros_datos,
    hdv.completa,
    hdv.completada_en,
    u.nombres,
    u.apellidos,
    u.correo,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id_aula_certificado', ac.id_aula_certificado,
          'id_aula_curso', ac.id_aula_curso,
          'titulo_curso', ac.titulo_curso,
          'fecha_emision', ac.fecha_emision,
          'numero_certificado', ac.numero_certificado
        )
      ) FILTER (WHERE ac.id_aula_certificado IS NOT NULL),
      '[]'::jsonb
    ) as certificados
  FROM hoja_de_vida hdv
  JOIN usuario u ON u.id_usuario = hdv.id_usuario
  LEFT JOIN aula_certificado ac ON ac.id_usuario = hdv.id_usuario
  WHERE hdv.id_usuario = p_id_usuario
  GROUP BY hdv.id_hoja_de_vida, hdv.id_usuario, hdv.titulo_profesional,
    hdv.experiencia_laboral, hdv.habilidades, hdv.resumen_profesional,
    hdv.foto_perfil_url, hdv.formacion_academica, hdv.otros_datos,
    hdv.completa, hdv.completada_en, u.nombres, u.apellidos, u.correo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
