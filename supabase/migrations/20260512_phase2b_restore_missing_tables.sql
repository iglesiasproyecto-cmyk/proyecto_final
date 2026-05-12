-- ============================================================
-- PHASE 2B: Restore Missing Tables After Deletion
-- ============================================================
-- These tables were present in pre-deletion schema but were not restored

-- TABLE 1: hoja_de_vida (if missing)
CREATE TABLE IF NOT EXISTS hoja_de_vida (
  id_hoja_de_vida BIGSERIAL PRIMARY KEY,
  id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  perfil_profesional TEXT,
  experiencia_laboral TEXT,
  formacion_academica TEXT,
  habilidades TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_updated_at_hoja_de_vida ON hoja_de_vida;
CREATE TRIGGER set_updated_at_hoja_de_vida
  BEFORE UPDATE ON hoja_de_vida FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_hoja_de_vida_usuario ON hoja_de_vida(id_usuario);
ALTER TABLE hoja_de_vida ENABLE ROW LEVEL SECURITY;

-- TABLE 2: aula_inscripcion (if missing)
CREATE TABLE IF NOT EXISTS aula_inscripcion (
  id_aula_inscripcion BIGSERIAL PRIMARY KEY,
  id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  id_aula_curso BIGINT NOT NULL REFERENCES aula_curso(id_aula_curso) ON DELETE CASCADE,
  fecha_inscripcion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_retiro DATE,
  estado estado_detalle NOT NULL DEFAULT 'inscrito',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_usuario, id_aula_curso),
  deleted_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS set_updated_at_aula_inscripcion ON aula_inscripcion;
CREATE TRIGGER set_updated_at_aula_inscripcion
  BEFORE UPDATE ON aula_inscripcion FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_aula_inscripcion_usuario ON aula_inscripcion(id_usuario);
CREATE INDEX IF NOT EXISTS idx_aula_inscripcion_aula_curso ON aula_inscripcion(id_aula_curso);
CREATE INDEX IF NOT EXISTS idx_aula_inscripcion_deleted ON aula_inscripcion(deleted_at) WHERE deleted_at IS NOT NULL;
ALTER TABLE aula_inscripcion ENABLE ROW LEVEL SECURITY;

-- TABLE 3: aula_certificado (if missing)
CREATE TABLE IF NOT EXISTS aula_certificado (
  id_aula_certificado BIGSERIAL PRIMARY KEY,
  id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  id_aula_curso BIGINT NOT NULL REFERENCES aula_curso(id_aula_curso) ON DELETE CASCADE,
  fecha_certificacion DATE NOT NULL,
  numero_certificado VARCHAR(100) UNIQUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_updated_at_aula_certificado ON aula_certificado;
CREATE TRIGGER set_updated_at_aula_certificado
  BEFORE UPDATE ON aula_certificado FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_aula_certificado_usuario ON aula_certificado(id_usuario);
ALTER TABLE aula_certificado ENABLE ROW LEVEL SECURITY;

-- RPC 1: get_hoja_de_vida_completa() - Fetch user resume/CV data
CREATE OR REPLACE FUNCTION public.get_hoja_de_vida_completa(usuario_id bigint)
RETURNS TABLE (
  id_usuario bigint,
  nombres varchar,
  apellidos varchar,
  correo varchar,
  perfil_profesional text,
  experiencia_laboral text,
  formacion_academica text,
  habilidades text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id_usuario,
    u.nombres,
    u.apellidos,
    u.correo,
    COALESCE(hv.perfil_profesional, '') as perfil_profesional,
    COALESCE(hv.experiencia_laboral, '') as experiencia_laboral,
    COALESCE(hv.formacion_academica, '') as formacion_academica,
    COALESCE(hv.habilidades, '') as habilidades
  FROM usuario u
  LEFT JOIN hoja_de_vida hv ON u.id_usuario = hv.id_usuario
  WHERE u.id_usuario = usuario_id
    AND u.activo = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_hoja_de_vida_completa(bigint) TO authenticated;
