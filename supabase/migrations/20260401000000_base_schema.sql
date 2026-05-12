-- ============================================================
-- BASE SCHEMA: IGLESIABD
-- Must run BEFORE all other migrations
-- ============================================================

-- PASO 0: Tipos ENUM
DO $$ BEGIN
  CREATE TYPE estado_iglesia    AS ENUM ('activa', 'inactiva', 'fusionada', 'cerrada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE estado_sede       AS ENUM ('activa', 'inactiva', 'en_construccion');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE estado_ministerio AS ENUM ('activo', 'inactivo', 'suspendido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE estado_evento     AS ENUM ('programado', 'en_curso', 'finalizado', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE estado_tarea      AS ENUM ('pendiente', 'en_progreso', 'completada', 'cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE prioridad_tarea   AS ENUM ('baja', 'media', 'alta', 'urgente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE estado_curso      AS ENUM ('borrador', 'activo', 'inactivo', 'archivado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE estado_modulo     AS ENUM ('borrador', 'publicado', 'archivado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE estado_evaluacion AS ENUM ('pendiente', 'aprobado', 'reprobado', 'en_revision');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE estado_proceso    AS ENUM ('programado', 'en_curso', 'finalizado', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE estado_detalle    AS ENUM ('inscrito', 'en_progreso', 'completado', 'retirado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE tipo_notificacion AS ENUM ('informacion', 'alerta', 'tarea', 'evento', 'curso');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- PASO 1: Función trigger updated_at
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 2: Geografía
CREATE TABLE IF NOT EXISTS pais (
  id_pais    BIGSERIAL    PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL UNIQUE,
  creado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS set_updated_at_pais ON pais;
CREATE TRIGGER set_updated_at_pais
  BEFORE UPDATE ON pais FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS departamento (
  id_departamento BIGSERIAL    PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  id_pais         BIGINT       NOT NULL REFERENCES pais(id_pais),
  creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (nombre, id_pais)
);
DROP TRIGGER IF EXISTS set_updated_at_departamento ON departamento;
CREATE TRIGGER set_updated_at_departamento
  BEFORE UPDATE ON departamento FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS ciudad (
  id_ciudad       BIGSERIAL    PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  id_departamento BIGINT       NOT NULL REFERENCES departamento(id_departamento),
  creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (nombre, id_departamento)
);
DROP TRIGGER IF EXISTS set_updated_at_ciudad ON ciudad;
CREATE TRIGGER set_updated_at_ciudad
  BEFORE UPDATE ON ciudad FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- PASO 3: Usuarios & Roles
CREATE TABLE IF NOT EXISTS rol (
  id_rol      BIGSERIAL    PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS set_updated_at_rol ON rol;
CREATE TRIGGER set_updated_at_rol
  BEFORE UPDATE ON rol FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS usuario (
  id_usuario      BIGSERIAL    PRIMARY KEY,
  nombres         VARCHAR(100) NOT NULL,
  apellidos       VARCHAR(100) NOT NULL,
  correo          VARCHAR(200) NOT NULL UNIQUE,
  contrasena_hash VARCHAR(255) NOT NULL,
  telefono        VARCHAR(20),
  activo          BOOLEAN      NOT NULL DEFAULT TRUE,
  ultimo_acceso   TIMESTAMPTZ,
  creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS set_updated_at_usuario ON usuario;
CREATE TRIGGER set_updated_at_usuario
  BEFORE UPDATE ON usuario FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE INDEX IF NOT EXISTS idx_usuario_correo ON usuario(correo);

-- PASO 4: Iglesia & Sedes
CREATE TABLE IF NOT EXISTS iglesia (
  id_iglesia      BIGSERIAL      PRIMARY KEY,
  nombre          VARCHAR(150)   NOT NULL,
  fecha_fundacion DATE,
  estado          estado_iglesia NOT NULL DEFAULT 'activa',
  id_ciudad       BIGINT         NOT NULL REFERENCES ciudad(id_ciudad),
  creado_en       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS set_updated_at_iglesia ON iglesia;
CREATE TRIGGER set_updated_at_iglesia
  BEFORE UPDATE ON iglesia FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS pastor (
  id_pastor  BIGSERIAL    PRIMARY KEY,
  nombres    VARCHAR(100) NOT NULL,
  apellidos  VARCHAR(100) NOT NULL,
  correo     VARCHAR(200) NOT NULL UNIQUE,
  telefono   VARCHAR(20),
  id_usuario BIGINT       UNIQUE REFERENCES usuario(id_usuario),
  creado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS set_updated_at_pastor ON pastor;
CREATE TRIGGER set_updated_at_pastor
  BEFORE UPDATE ON pastor FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS iglesia_pastor (
  id_iglesia_pastor BIGSERIAL   PRIMARY KEY,
  id_iglesia        BIGINT      NOT NULL REFERENCES iglesia(id_iglesia),
  id_pastor         BIGINT      NOT NULL REFERENCES pastor(id_pastor),
  es_principal      BOOLEAN     NOT NULL DEFAULT TRUE,
  fecha_inicio      DATE        NOT NULL,
  fecha_fin         DATE,
  observaciones     TEXT,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS set_updated_at_iglesia_pastor ON iglesia_pastor;
CREATE TRIGGER set_updated_at_iglesia_pastor
  BEFORE UPDATE ON iglesia_pastor FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE INDEX IF NOT EXISTS idx_iglesia_pastor_activo ON iglesia_pastor(id_iglesia) WHERE fecha_fin IS NULL;

CREATE TABLE IF NOT EXISTS sede (
  id_sede    BIGSERIAL   PRIMARY KEY,
  nombre     VARCHAR(150) NOT NULL,
  direccion  VARCHAR(255),
  id_ciudad  BIGINT       NOT NULL REFERENCES ciudad(id_ciudad),
  id_iglesia BIGINT       NOT NULL REFERENCES iglesia(id_iglesia),
  estado     estado_sede  NOT NULL DEFAULT 'activa',
  creado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS set_updated_at_sede ON sede;
CREATE TRIGGER set_updated_at_sede
  BEFORE UPDATE ON sede FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS sede_pastor (
  id_sede_pastor BIGSERIAL   PRIMARY KEY,
  id_sede        BIGINT      NOT NULL REFERENCES sede(id_sede),
  id_pastor      BIGINT      NOT NULL REFERENCES pastor(id_pastor),
  es_principal   BOOLEAN     NOT NULL DEFAULT TRUE,
  fecha_inicio   DATE        NOT NULL,
  fecha_fin      DATE,
  observaciones  TEXT,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_sede, id_pastor, fecha_inicio)
);
DROP TRIGGER IF EXISTS set_updated_at_sede_pastor ON sede_pastor;
CREATE TRIGGER set_updated_at_sede_pastor
  BEFORE UPDATE ON sede_pastor FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE INDEX IF NOT EXISTS idx_sede_pastor_activo ON sede_pastor(id_sede) WHERE fecha_fin IS NULL;

-- PASO 5: Ministerios
CREATE TABLE IF NOT EXISTS ministerio (
  id_ministerio BIGSERIAL         PRIMARY KEY,
  nombre        VARCHAR(100)      NOT NULL,
  descripcion   TEXT,
  estado        estado_ministerio NOT NULL DEFAULT 'activo',
  id_sede       BIGINT            NOT NULL REFERENCES sede(id_sede),
  creado_en     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  UNIQUE (nombre, id_sede)
);
DROP TRIGGER IF EXISTS set_updated_at_ministerio ON ministerio;
CREATE TRIGGER set_updated_at_ministerio
  BEFORE UPDATE ON ministerio FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS miembro_ministerio (
  id_miembro_ministerio BIGSERIAL   PRIMARY KEY,
  id_usuario            BIGINT      NOT NULL REFERENCES usuario(id_usuario),
  id_ministerio         BIGINT      NOT NULL REFERENCES ministerio(id_ministerio),
  rol_en_ministerio     VARCHAR(100),
  fecha_ingreso         DATE        NOT NULL DEFAULT CURRENT_DATE,
  fecha_salida          DATE,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_usuario, id_ministerio, fecha_ingreso)
);
DROP TRIGGER IF EXISTS set_updated_at_miembro_ministerio ON miembro_ministerio;
CREATE TRIGGER set_updated_at_miembro_ministerio
  BEFORE UPDATE ON miembro_ministerio FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- PASO 6: usuario_rol y notificacion
CREATE TABLE IF NOT EXISTS usuario_rol (
  id_usuario_rol BIGSERIAL   PRIMARY KEY,
  id_usuario     BIGINT      NOT NULL REFERENCES usuario(id_usuario),
  id_rol         BIGINT      NOT NULL REFERENCES rol(id_rol),
  id_iglesia     BIGINT      NOT NULL REFERENCES iglesia(id_iglesia),
  id_sede        BIGINT      REFERENCES sede(id_sede),
  fecha_inicio   DATE        NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin      DATE,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS set_updated_at_usuario_rol ON usuario_rol;
CREATE TRIGGER set_updated_at_usuario_rol
  BEFORE UPDATE ON usuario_rol FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE INDEX IF NOT EXISTS idx_usuario_rol_activo ON usuario_rol(id_usuario, id_rol) WHERE fecha_fin IS NULL;

CREATE TABLE IF NOT EXISTS notificacion (
  id_notificacion BIGSERIAL         PRIMARY KEY,
  id_usuario      BIGINT            NOT NULL REFERENCES usuario(id_usuario),
  titulo          VARCHAR(200)      NOT NULL,
  mensaje         TEXT              NOT NULL,
  leida           BOOLEAN           NOT NULL DEFAULT FALSE,
  fecha_lectura   TIMESTAMPTZ,
  tipo            tipo_notificacion NOT NULL DEFAULT 'informacion',
  creado_en       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS set_updated_at_notificacion ON notificacion;
CREATE TRIGGER set_updated_at_notificacion
  BEFORE UPDATE ON notificacion FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE INDEX IF NOT EXISTS idx_notificacion_no_leida ON notificacion(id_usuario) WHERE leida = FALSE;

-- PASO 7: Eventos & Tareas
CREATE TABLE IF NOT EXISTS tipo_evento (
  id_tipo_evento BIGSERIAL    PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL UNIQUE,
  descripcion    TEXT,
  creado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS set_updated_at_tipo_evento ON tipo_evento;
CREATE TRIGGER set_updated_at_tipo_evento
  BEFORE UPDATE ON tipo_evento FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS evento (
  id_evento      BIGSERIAL     PRIMARY KEY,
  nombre         VARCHAR(150)  NOT NULL,
  descripcion    TEXT,
  id_tipo_evento BIGINT        NOT NULL REFERENCES tipo_evento(id_tipo_evento),
  fecha_inicio   TIMESTAMPTZ   NOT NULL,
  fecha_fin      TIMESTAMPTZ   NOT NULL,
  estado         estado_evento NOT NULL DEFAULT 'programado',
  id_iglesia     BIGINT        NOT NULL REFERENCES iglesia(id_iglesia),
  id_sede        BIGINT        REFERENCES sede(id_sede),
  id_ministerio  BIGINT        REFERENCES ministerio(id_ministerio),
  creado_en      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS set_updated_at_evento ON evento;
CREATE TRIGGER set_updated_at_evento
  BEFORE UPDATE ON evento FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE INDEX IF NOT EXISTS idx_evento_fecha ON evento(fecha_inicio, estado);

CREATE TABLE IF NOT EXISTS tarea (
  id_tarea           BIGSERIAL       PRIMARY KEY,
  titulo             VARCHAR(200)    NOT NULL,
  descripcion        TEXT,
  fecha_limite       TIMESTAMPTZ,
  estado             estado_tarea    NOT NULL DEFAULT 'pendiente',
  prioridad          prioridad_tarea NOT NULL DEFAULT 'media',
  id_evento          BIGINT          REFERENCES evento(id_evento),
  id_usuario_creador BIGINT          NOT NULL REFERENCES usuario(id_usuario),
  creado_en          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS set_updated_at_tarea ON tarea;
CREATE TRIGGER set_updated_at_tarea
  BEFORE UPDATE ON tarea FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS tarea_asignada (
  id_tarea_asignada BIGSERIAL   PRIMARY KEY,
  id_tarea          BIGINT      NOT NULL REFERENCES tarea(id_tarea),
  id_usuario        BIGINT      NOT NULL REFERENCES usuario(id_usuario),
  fecha_asignacion  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_completado  TIMESTAMPTZ,
  observaciones     TEXT,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS set_updated_at_tarea_asignada ON tarea_asignada;
CREATE TRIGGER set_updated_at_tarea_asignada
  BEFORE UPDATE ON tarea_asignada FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- PASO 8: Cursos & Formación
CREATE TABLE IF NOT EXISTS curso (
  id_curso           BIGSERIAL    PRIMARY KEY,
  nombre             VARCHAR(200) NOT NULL,
  descripcion        TEXT,
  duracion_horas     INT CHECK (duracion_horas > 0),
  estado             estado_curso NOT NULL DEFAULT 'borrador',
  id_ministerio      BIGINT       NOT NULL REFERENCES ministerio(id_ministerio),
  id_usuario_creador BIGINT       NOT NULL REFERENCES usuario(id_usuario),
  creado_en          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS set_updated_at_curso ON curso;
CREATE TRIGGER set_updated_at_curso
  BEFORE UPDATE ON curso FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS modulo (
  id_modulo   BIGSERIAL     PRIMARY KEY,
  titulo      VARCHAR(150)  NOT NULL,
  descripcion TEXT,
  orden       INT           NOT NULL DEFAULT 1 CHECK (orden > 0),
  estado      estado_modulo NOT NULL DEFAULT 'borrador',
  id_curso    BIGINT        NOT NULL REFERENCES curso(id_curso),
  creado_en   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (id_curso, orden)
);
DROP TRIGGER IF EXISTS set_updated_at_modulo ON modulo;
CREATE TRIGGER set_updated_at_modulo
  BEFORE UPDATE ON modulo FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS evaluacion (
  id_evaluacion    BIGSERIAL         PRIMARY KEY,
  id_modulo        BIGINT            NOT NULL REFERENCES modulo(id_modulo),
  id_usuario       BIGINT            NOT NULL REFERENCES usuario(id_usuario),
  calificacion     NUMERIC(5,2)      CHECK (calificacion >= 0 AND calificacion <= 100),
  estado           estado_evaluacion NOT NULL DEFAULT 'pendiente',
  observaciones    TEXT,
  fecha_evaluacion TIMESTAMPTZ,
  creado_en        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  UNIQUE (id_modulo, id_usuario)
);
DROP TRIGGER IF EXISTS set_updated_at_evaluacion ON evaluacion;
CREATE TRIGGER set_updated_at_evaluacion
  BEFORE UPDATE ON evaluacion FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS proceso_asignado_curso (
  id_proceso_asignado_curso BIGSERIAL      PRIMARY KEY,
  id_curso                  BIGINT         NOT NULL REFERENCES curso(id_curso),
  id_iglesia                BIGINT         NOT NULL REFERENCES iglesia(id_iglesia),
  fecha_inicio              DATE           NOT NULL,
  fecha_fin                 DATE           NOT NULL,
  estado                    estado_proceso NOT NULL DEFAULT 'programado',
  creado_en                 TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CHECK (fecha_fin > fecha_inicio)
);
DROP TRIGGER IF EXISTS set_updated_at_proceso_asignado_curso ON proceso_asignado_curso;
CREATE TRIGGER set_updated_at_proceso_asignado_curso
  BEFORE UPDATE ON proceso_asignado_curso FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS detalle_proceso_curso (
  id_detalle_proceso_curso  BIGSERIAL      PRIMARY KEY,
  id_proceso_asignado_curso BIGINT         NOT NULL REFERENCES proceso_asignado_curso(id_proceso_asignado_curso),
  id_usuario                BIGINT         NOT NULL REFERENCES usuario(id_usuario),
  fecha_inscripcion         DATE           NOT NULL DEFAULT CURRENT_DATE,
  estado                    estado_detalle NOT NULL DEFAULT 'inscrito',
  creado_en                 TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS set_updated_at_detalle_proceso_curso ON detalle_proceso_curso;
CREATE TRIGGER set_updated_at_detalle_proceso_curso
  BEFORE UPDATE ON detalle_proceso_curso FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- PASO 9: Habilitar RLS en todas las tablas
ALTER TABLE pais                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE departamento           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciudad                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE iglesia                ENABLE ROW LEVEL SECURITY;
ALTER TABLE pastor                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE iglesia_pastor         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sede                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sede_pastor            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministerio             ENABLE ROW LEVEL SECURITY;
ALTER TABLE miembro_ministerio     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rol                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario                ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_rol            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacion           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_evento            ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarea                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarea_asignada         ENABLE ROW LEVEL SECURITY;
ALTER TABLE curso                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulo                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluacion             ENABLE ROW LEVEL SECURITY;
ALTER TABLE proceso_asignado_curso ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_proceso_curso  ENABLE ROW LEVEL SECURITY;
