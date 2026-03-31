# IGLESIABD — Instrucciones para el Agente: Implementación en Supabase

---

## 🎯 Rol del Agente

Eres un **ingeniero de bases de datos experto en Supabase y PostgreSQL**. Tu única tarea en esta sesión es implementar el esquema relacional `IGLESIABD` en un proyecto Supabase existente, ejecutando el SQL exactamente como se indica en este documento, en el orden especificado, sin modificar nombres ni estructuras.
Vas a utilizar la herramienta de mcpSupabase 

**Reglas que debes seguir sin excepción:**

- Ejecuta cada bloque SQL en el **SQL Editor de Supabase** (`Database → SQL Editor → New query`).
- Respeta el **orden de ejecución**: primero tablas base (sin FK), luego tablas dependientes. Nunca crear una FK hacia una tabla que aún no existe.
- Usa el schema `public` para todas las tablas.
- **No uses `AUTO_INCREMENT`** — en PostgreSQL la equivalencia es `GENERATED ALWAYS AS IDENTITY` o el tipo `SERIAL`. Usa `BIGSERIAL` para todas las PKs.
- **No uses `TINYINT(1)`** — en PostgreSQL usa `BOOLEAN`.
- **No uses `DATETIME`** — en PostgreSQL usa `TIMESTAMPTZ` (timestamp with time zone).
- **No uses `ENUM` inline** — en PostgreSQL crea un tipo `CREATE TYPE ... AS ENUM(...)` antes de la tabla que lo usa.
- **`ON UPDATE NOW()` no existe en PostgreSQL** — usa un trigger de actualización automática (se provee al final).
- Habilita **Row Level Security (RLS)** en todas las tablas después de crearlas.
- Si un paso falla, reporta el error exacto y detente. No continúes al siguiente paso.
- Al terminar, confirma cada tabla creada con `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`

---

## 📋 Resumen del Esquema

| Métrica | Valor |
|---|---|
| Total de tablas | 24 |
| Total de relaciones FK | 35 |
| Dominios funcionales | 6 |
| Schema destino | `public` |
| Motor | PostgreSQL (Supabase) |

**Dominios:**

| Dominio | Tablas |
|---|---|
| Geografía | `pais`, `departamento`, `ciudad` |
| Iglesia & Sedes | `iglesia`, `pastor`, `iglesia_pastor`, `sede`, `sede_pastor` |
| Ministerios | `ministerio`, `miembro_ministerio` |
| Usuarios & Roles | `rol`, `usuario`, `usuario_rol`, `notificacion` |
| Eventos & Tareas | `tipo_evento`, `evento`, `tarea`, `tarea_asignada` |
| Cursos & Formación | `curso`, `modulo`, `evaluacion`, `proceso_asignado_curso`, `detalle_proceso_curso` |

> **Convención de nombres:** Los nombres de tabla y columna se escriben en `snake_case` en PostgreSQL. El agente debe convertir el camelCase original (`idPais` → `id_pais`, `creadoEn` → `creado_en`, etc.) y los PascalCase de tabla (`Pais` → `pais`, `IglesiaPastor` → `iglesia_pastor`).

---

## ⚙️ PASO 0 — Tipos ENUM personalizados

Ejecuta este bloque **primero**, antes de crear ninguna tabla.

```sql
-- ============================================================
-- PASO 0: Tipos ENUM
-- Ejecutar ANTES de crear cualquier tabla
-- ============================================================

CREATE TYPE estado_iglesia    AS ENUM ('activa', 'inactiva', 'fusionada', 'cerrada');
CREATE TYPE estado_sede       AS ENUM ('activa', 'inactiva', 'en_construccion');
CREATE TYPE estado_ministerio AS ENUM ('activo', 'inactivo', 'suspendido');
CREATE TYPE estado_evento     AS ENUM ('programado', 'en_curso', 'finalizado', 'cancelado');
CREATE TYPE estado_tarea      AS ENUM ('pendiente', 'en_progreso', 'completada', 'cancelada');
CREATE TYPE prioridad_tarea   AS ENUM ('baja', 'media', 'alta', 'urgente');
CREATE TYPE estado_curso      AS ENUM ('borrador', 'activo', 'inactivo', 'archivado');
CREATE TYPE estado_modulo     AS ENUM ('borrador', 'publicado', 'archivado');
CREATE TYPE estado_evaluacion AS ENUM ('pendiente', 'aprobado', 'reprobado', 'en_revision');
CREATE TYPE estado_proceso    AS ENUM ('programado', 'en_curso', 'finalizado', 'cancelado');
CREATE TYPE estado_detalle    AS ENUM ('inscrito', 'en_progreso', 'completado', 'retirado');
CREATE TYPE tipo_notificacion AS ENUM ('informacion', 'alerta', 'tarea', 'evento', 'curso');
```

---

## ⚙️ PASO 1 — Función de auditoría `updated_at`

PostgreSQL no tiene `ON UPDATE NOW()`. Este trigger reemplaza esa funcionalidad para todas las tablas.

```sql
-- ============================================================
-- PASO 1: Función trigger para actualizar updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## ⚙️ PASO 2 — Dominio: Geografía

```sql
-- ============================================================
-- PASO 2A: pais
-- ============================================================

CREATE TABLE pais (
  id_pais      BIGSERIAL    PRIMARY KEY,
  nombre       VARCHAR(100) NOT NULL UNIQUE,
  creado_en    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_pais
  BEFORE UPDATE ON pais
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- PASO 2B: departamento
-- ============================================================

CREATE TABLE departamento (
  id_departamento BIGSERIAL    PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  id_pais         BIGINT       NOT NULL REFERENCES pais(id_pais),
  creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (nombre, id_pais)
);

CREATE TRIGGER set_updated_at_departamento
  BEFORE UPDATE ON departamento
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- PASO 2C: ciudad
-- ============================================================

CREATE TABLE ciudad (
  id_ciudad       BIGSERIAL    PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  id_departamento BIGINT       NOT NULL REFERENCES departamento(id_departamento),
  creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (nombre, id_departamento)
);

CREATE TRIGGER set_updated_at_ciudad
  BEFORE UPDATE ON ciudad
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
```

---

## ⚙️ PASO 3 — Dominio: Usuarios & Roles

> ⚠️ `usuario` debe crearse **antes** que `pastor`, `iglesia_pastor`, `sede_pastor`, `usuario_rol`, `notificacion`, `tarea`, `tarea_asignada`, `evaluacion`, `miembro_ministerio`, `detalle_proceso_curso` y `curso` — todos tienen FK hacia `usuario`.

```sql
-- ============================================================
-- PASO 3A: rol
-- ============================================================

CREATE TABLE rol (
  id_rol      BIGSERIAL    PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_rol
  BEFORE UPDATE ON rol
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- PASO 3B: usuario
-- ============================================================

CREATE TABLE usuario (
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

CREATE TRIGGER set_updated_at_usuario
  BEFORE UPDATE ON usuario
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_usuario_correo ON usuario(correo);
```

---

## ⚙️ PASO 4 — Dominio: Iglesia & Sedes

```sql
-- ============================================================
-- PASO 4A: iglesia
-- ============================================================

CREATE TABLE iglesia (
  id_iglesia       BIGSERIAL       PRIMARY KEY,
  nombre           VARCHAR(150)    NOT NULL,
  fecha_fundacion  DATE,
  estado           estado_iglesia  NOT NULL DEFAULT 'activa',
  id_ciudad        BIGINT          NOT NULL REFERENCES ciudad(id_ciudad),
  creado_en        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_iglesia
  BEFORE UPDATE ON iglesia
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- PASO 4B: pastor
-- Depende de: usuario (FK opcional)
-- ============================================================

CREATE TABLE pastor (
  id_pastor   BIGSERIAL    PRIMARY KEY,
  nombres     VARCHAR(100) NOT NULL,
  apellidos   VARCHAR(100) NOT NULL,
  correo      VARCHAR(200) NOT NULL UNIQUE,
  telefono    VARCHAR(20),
  id_usuario  BIGINT       UNIQUE REFERENCES usuario(id_usuario),
  creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_pastor
  BEFORE UPDATE ON pastor
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- PASO 4C: iglesia_pastor
-- Tabla de asignación pastor ↔ iglesia con historial
-- ============================================================

CREATE TABLE iglesia_pastor (
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

CREATE TRIGGER set_updated_at_iglesia_pastor
  BEFORE UPDATE ON iglesia_pastor
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_iglesia_pastor_activo ON iglesia_pastor(id_iglesia) WHERE fecha_fin IS NULL;

-- ============================================================
-- PASO 4D: sede
-- Depende de: ciudad, iglesia
-- ============================================================

CREATE TABLE sede (
  id_sede     BIGSERIAL     PRIMARY KEY,
  nombre      VARCHAR(150)  NOT NULL,
  direccion   VARCHAR(255),
  id_ciudad   BIGINT        NOT NULL REFERENCES ciudad(id_ciudad),
  id_iglesia  BIGINT        NOT NULL REFERENCES iglesia(id_iglesia),
  estado      estado_sede   NOT NULL DEFAULT 'activa',
  creado_en   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_sede
  BEFORE UPDATE ON sede
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- PASO 4E: sede_pastor
-- Tabla de asignación pastor ↔ sede con historial
-- ============================================================

CREATE TABLE sede_pastor (
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

CREATE TRIGGER set_updated_at_sede_pastor
  BEFORE UPDATE ON sede_pastor
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_sede_pastor_activo ON sede_pastor(id_sede) WHERE fecha_fin IS NULL;
```

---

## ⚙️ PASO 5 — Dominio: Ministerios

```sql
-- ============================================================
-- PASO 5A: ministerio
-- Depende de: sede
-- ============================================================

CREATE TABLE ministerio (
  id_ministerio BIGSERIAL          PRIMARY KEY,
  nombre        VARCHAR(100)       NOT NULL,
  descripcion   TEXT,
  estado        estado_ministerio  NOT NULL DEFAULT 'activo',
  id_sede       BIGINT             NOT NULL REFERENCES sede(id_sede),
  creado_en     TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  UNIQUE (nombre, id_sede)
);

CREATE TRIGGER set_updated_at_ministerio
  BEFORE UPDATE ON ministerio
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- PASO 5B: miembro_ministerio
-- Depende de: usuario, ministerio
-- ============================================================

CREATE TABLE miembro_ministerio (
  id_miembro_ministerio BIGSERIAL    PRIMARY KEY,
  id_usuario            BIGINT       NOT NULL REFERENCES usuario(id_usuario),
  id_ministerio         BIGINT       NOT NULL REFERENCES ministerio(id_ministerio),
  rol_en_ministerio     VARCHAR(100),
  fecha_ingreso         DATE         NOT NULL DEFAULT CURRENT_DATE,
  fecha_salida          DATE,
  creado_en             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (id_usuario, id_ministerio, fecha_ingreso)
);

CREATE TRIGGER set_updated_at_miembro_ministerio
  BEFORE UPDATE ON miembro_ministerio
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
```

---

## ⚙️ PASO 6 — Usuarios: Roles y Notificaciones

```sql
-- ============================================================
-- PASO 6A: usuario_rol
-- Depende de: usuario, rol, iglesia, sede
-- ============================================================

CREATE TABLE usuario_rol (
  id_usuario_rol BIGSERIAL   PRIMARY KEY,
  id_usuario     BIGINT      NOT NULL REFERENCES usuario(id_usuario),
  id_rol         BIGINT      NOT NULL REFERENCES rol(id_rol),
  id_iglesia     BIGINT      NOT NULL REFERENCES iglesia(id_iglesia),
  id_sede        BIGINT      REFERENCES sede(id_sede),    -- NULL = aplica a toda la iglesia
  fecha_inicio   DATE        NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin      DATE,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_usuario_rol
  BEFORE UPDATE ON usuario_rol
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_usuario_rol_activo ON usuario_rol(id_usuario, id_rol) WHERE fecha_fin IS NULL;

-- ============================================================
-- PASO 6B: notificacion
-- Depende de: usuario
-- ============================================================

CREATE TABLE notificacion (
  id_notificacion BIGSERIAL          PRIMARY KEY,
  id_usuario      BIGINT             NOT NULL REFERENCES usuario(id_usuario),
  titulo          VARCHAR(200)       NOT NULL,
  mensaje         TEXT               NOT NULL,
  leida           BOOLEAN            NOT NULL DEFAULT FALSE,
  fecha_lectura   TIMESTAMPTZ,
  tipo            tipo_notificacion  NOT NULL DEFAULT 'informacion',
  creado_en       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_notificacion
  BEFORE UPDATE ON notificacion
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_notificacion_no_leida ON notificacion(id_usuario) WHERE leida = FALSE;
```

---

## ⚙️ PASO 7 — Dominio: Eventos & Tareas

```sql
-- ============================================================
-- PASO 7A: tipo_evento
-- ============================================================

CREATE TABLE tipo_evento (
  id_tipo_evento BIGSERIAL    PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL UNIQUE,
  descripcion    TEXT,
  creado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_tipo_evento
  BEFORE UPDATE ON tipo_evento
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- PASO 7B: evento
-- Depende de: tipo_evento, iglesia, sede, ministerio
-- ============================================================

CREATE TABLE evento (
  id_evento      BIGSERIAL      PRIMARY KEY,
  nombre         VARCHAR(150)   NOT NULL,
  descripcion    TEXT,
  id_tipo_evento BIGINT         NOT NULL REFERENCES tipo_evento(id_tipo_evento),
  fecha_inicio   TIMESTAMPTZ    NOT NULL,
  fecha_fin      TIMESTAMPTZ    NOT NULL,
  estado         estado_evento  NOT NULL DEFAULT 'programado',
  id_iglesia     BIGINT         NOT NULL REFERENCES iglesia(id_iglesia),
  id_sede        BIGINT         REFERENCES sede(id_sede),          -- NULL = sin sede física
  id_ministerio  BIGINT         REFERENCES ministerio(id_ministerio),
  creado_en      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_evento
  BEFORE UPDATE ON evento
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_evento_fecha ON evento(fecha_inicio, estado);

-- ============================================================
-- PASO 7C: tarea
-- Depende de: evento (opcional), usuario
-- ============================================================

CREATE TABLE tarea (
  id_tarea           BIGSERIAL        PRIMARY KEY,
  titulo             VARCHAR(200)     NOT NULL,
  descripcion        TEXT,
  fecha_limite       TIMESTAMPTZ,
  estado             estado_tarea     NOT NULL DEFAULT 'pendiente',
  prioridad          prioridad_tarea  NOT NULL DEFAULT 'media',
  id_evento          BIGINT           REFERENCES evento(id_evento),   -- NULL = tarea independiente
  id_usuario_creador BIGINT           NOT NULL REFERENCES usuario(id_usuario),
  creado_en          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_tarea
  BEFORE UPDATE ON tarea
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- PASO 7D: tarea_asignada
-- Depende de: tarea, usuario
-- ============================================================

CREATE TABLE tarea_asignada (
  id_tarea_asignada BIGSERIAL   PRIMARY KEY,
  id_tarea          BIGINT      NOT NULL REFERENCES tarea(id_tarea),
  id_usuario        BIGINT      NOT NULL REFERENCES usuario(id_usuario),
  fecha_asignacion  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_completado  TIMESTAMPTZ,
  observaciones     TEXT,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_tarea_asignada
  BEFORE UPDATE ON tarea_asignada
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
```

---

## ⚙️ PASO 8 — Dominio: Cursos & Formación

```sql
-- ============================================================
-- PASO 8A: curso
-- Depende de: ministerio, usuario
-- ============================================================

CREATE TABLE curso (
  id_curso           BIGSERIAL     PRIMARY KEY,
  nombre             VARCHAR(200)  NOT NULL,
  descripcion        TEXT,
  duracion_horas     INT CHECK (duracion_horas > 0),
  estado             estado_curso  NOT NULL DEFAULT 'borrador',
  id_ministerio      BIGINT        NOT NULL REFERENCES ministerio(id_ministerio),
  id_usuario_creador BIGINT        NOT NULL REFERENCES usuario(id_usuario),
  creado_en          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_curso
  BEFORE UPDATE ON curso
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- PASO 8B: modulo
-- Depende de: curso
-- ============================================================

CREATE TABLE modulo (
  id_modulo   BIGSERIAL      PRIMARY KEY,
  titulo      VARCHAR(150)   NOT NULL,
  descripcion TEXT,
  orden       INT            NOT NULL DEFAULT 1 CHECK (orden > 0),
  estado      estado_modulo  NOT NULL DEFAULT 'borrador',
  id_curso    BIGINT         NOT NULL REFERENCES curso(id_curso),
  creado_en   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (id_curso, orden)
);

CREATE TRIGGER set_updated_at_modulo
  BEFORE UPDATE ON modulo
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- PASO 8C: evaluacion
-- Depende de: modulo, usuario
-- ============================================================

CREATE TABLE evaluacion (
  id_evaluacion    BIGSERIAL          PRIMARY KEY,
  id_modulo        BIGINT             NOT NULL REFERENCES modulo(id_modulo),
  id_usuario       BIGINT             NOT NULL REFERENCES usuario(id_usuario),
  calificacion     NUMERIC(5,2)       CHECK (calificacion >= 0 AND calificacion <= 100),
  estado           estado_evaluacion  NOT NULL DEFAULT 'pendiente',
  observaciones    TEXT,
  fecha_evaluacion TIMESTAMPTZ,
  creado_en        TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  UNIQUE (id_modulo, id_usuario)
);

CREATE TRIGGER set_updated_at_evaluacion
  BEFORE UPDATE ON evaluacion
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- PASO 8D: proceso_asignado_curso
-- Depende de: curso, iglesia
-- ============================================================

CREATE TABLE proceso_asignado_curso (
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

CREATE TRIGGER set_updated_at_proceso_asignado_curso
  BEFORE UPDATE ON proceso_asignado_curso
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- PASO 8E: detalle_proceso_curso
-- Depende de: proceso_asignado_curso, usuario
-- ============================================================

CREATE TABLE detalle_proceso_curso (
  id_detalle_proceso_curso  BIGSERIAL      PRIMARY KEY,
  id_proceso_asignado_curso BIGINT         NOT NULL REFERENCES proceso_asignado_curso(id_proceso_asignado_curso),
  id_usuario                BIGINT         NOT NULL REFERENCES usuario(id_usuario),
  fecha_inscripcion         DATE           NOT NULL DEFAULT CURRENT_DATE,
  estado                    estado_detalle NOT NULL DEFAULT 'inscrito',
  creado_en                 TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_detalle_proceso_curso
  BEFORE UPDATE ON detalle_proceso_curso
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
```

---

## ⚙️ PASO 9 — Row Level Security (RLS)

Supabase requiere que habilites RLS explícitamente. Ejecuta este bloque para habilitarlo en **todas las tablas**.

```sql
-- ============================================================
-- PASO 9: Habilitar RLS en todas las tablas
-- ============================================================

ALTER TABLE pais                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE departamento              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciudad                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE iglesia                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pastor                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE iglesia_pastor            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sede                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sede_pastor               ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministerio                ENABLE ROW LEVEL SECURITY;
ALTER TABLE miembro_ministerio        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rol                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_rol               ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacion              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_evento               ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarea                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarea_asignada            ENABLE ROW LEVEL SECURITY;
ALTER TABLE curso                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulo                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluacion                ENABLE ROW LEVEL SECURITY;
ALTER TABLE proceso_asignado_curso    ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_proceso_curso     ENABLE ROW LEVEL SECURITY;
```

> **Nota importante sobre RLS:** Al habilitar RLS, por defecto **ningún usuario puede leer ni escribir** ninguna tabla. Debes agregar políticas (`CREATE POLICY`) según los roles de tu aplicación. El bloque de políticas base está en el PASO 10.

---

## ⚙️ PASO 10 — Políticas RLS base

Este bloque crea políticas mínimas funcionales. Ajústalas según la lógica de tu aplicación.

```sql
-- ============================================================
-- PASO 10: Políticas RLS base
-- Estas políticas permiten acceso total al service_role
-- y acceso de lectura autenticada a tablas de catálogo.
-- ============================================================

-- Tablas de catálogo: lectura pública autenticada
CREATE POLICY "Lectura autenticada" ON pais
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura autenticada" ON departamento
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura autenticada" ON ciudad
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura autenticada" ON tipo_evento
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura autenticada" ON rol
  FOR SELECT TO authenticated USING (true);

-- Tabla usuario: cada usuario solo ve su propio registro
-- NOTA: auth.uid() referencia al UUID del usuario en Supabase Auth.
-- Si vinculas usuario.id_usuario con auth.users.id, usa la siguiente política:
-- CREATE POLICY "Solo propio registro" ON usuario
--   FOR SELECT TO authenticated
--   USING (id_usuario::text = auth.uid()::text);
--
-- Por ahora, política permisiva para desarrollo:
CREATE POLICY "Acceso autenticado usuarios" ON usuario
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Notificaciones: cada usuario solo ve las suyas
CREATE POLICY "Solo propias notificaciones" ON notificacion
  FOR SELECT TO authenticated
  USING (id_usuario IN (
    SELECT id_usuario FROM usuario
    -- reemplaza con: WHERE id_usuario::text = auth.uid()::text
    LIMIT 1
  ));

-- Para todas las demás tablas: acceso total para authenticated durante desarrollo
-- ⚠️  REEMPLAZAR con políticas específicas antes de producción

DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'iglesia','pastor','iglesia_pastor','sede','sede_pastor',
    'ministerio','miembro_ministerio','usuario_rol',
    'evento','tarea','tarea_asignada',
    'curso','modulo','evaluacion','proceso_asignado_curso','detalle_proceso_curso'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format(
      'CREATE POLICY "Acceso desarrollo" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;
```

---

## ⚙️ PASO 11 — Verificación final

Ejecuta estas consultas para confirmar que el esquema se creó correctamente.

```sql
-- ============================================================
-- PASO 11A: Contar tablas creadas (esperado: 24)
-- ============================================================

SELECT COUNT(*) AS total_tablas
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- ============================================================
-- PASO 11B: Listar todas las tablas
-- ============================================================

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================================
-- PASO 11C: Verificar todas las FK creadas (esperado: 35)
-- ============================================================

SELECT
  tc.table_name         AS tabla_origen,
  kcu.column_name       AS columna_fk,
  ccu.table_name        AS tabla_destino,
  ccu.column_name       AS columna_destino
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================
-- PASO 11D: Verificar tipos ENUM creados (esperado: 13)
-- ============================================================

SELECT typname AS tipo_enum
FROM pg_type
WHERE typcategory = 'E'
ORDER BY typname;

-- ============================================================
-- PASO 11E: Verificar triggers de updated_at (esperado: 23)
-- ============================================================

SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'set_updated_at%'
ORDER BY event_object_table;
```

---

## 📐 Tabla de equivalencias MySQL → PostgreSQL

| Concepto MySQL | Equivalente PostgreSQL (Supabase) |
|---|---|
| `INT AUTO_INCREMENT` | `BIGSERIAL` |
| `TINYINT(1)` | `BOOLEAN` |
| `DATETIME` | `TIMESTAMPTZ` |
| `DECIMAL(5,2)` | `NUMERIC(5,2)` |
| `INT UNSIGNED` | `INT CHECK (col > 0)` |
| `ENUM('a','b')` inline | `CREATE TYPE nombre AS ENUM ('a','b')` + referenciarlo |
| `DEFAULT NOW()` | `DEFAULT NOW()` ✅ igual |
| `ON UPDATE NOW()` | Trigger `BEFORE UPDATE` con función |
| `VARCHAR(n)` | `VARCHAR(n)` ✅ igual |
| `TEXT` | `TEXT` ✅ igual |
| `DATE` | `DATE` ✅ igual |
| `UNIQUE KEY compuesto` | `UNIQUE (col1, col2)` inline en `CREATE TABLE` |
| `INDEX` | `CREATE INDEX idx_nombre ON tabla(col)` |

---

## ⚠️ Advertencias importantes

1. **Supabase Auth vs tabla `usuario`:** Supabase tiene su propio sistema de autenticación en el schema `auth`. Si quieres integrar `usuario` con `auth.users`, agrega una columna `auth_id UUID REFERENCES auth.users(id)` a la tabla `usuario` o usa `auth.users` directamente. Esta decisión depende de la arquitectura de la aplicación y **no está incluida en este script** — consulta al desarrollador antes de ejecutar el paso de autenticación.

2. **Contraseñas:** La columna `contrasena_hash` en `usuario` es para sistemas que gestionan autenticación propia. Si usas **Supabase Auth**, las contraseñas las maneja Supabase internamente y esta columna puede quedar vacía o eliminarse.

3. **Orden de ejecución es obligatorio.** Si saltas un paso y falla por FK, ejecuta los pasos en orden desde el inicio. Puedes reiniciar limpiando con: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` — pero esto borra **todo** lo que exista en el schema.

4. **RLS en producción:** Las políticas del PASO 10 son para desarrollo. Antes de llevar a producción, diseña políticas específicas por rol de usuario (`authenticated`, roles de Supabase, etc.).

5. **`ProcesoAsignadoCurso`:** En el HTML original este tabla tenía una FK a `ministerio` en lugar de `iglesia`. En este documento se corrigió a `iglesia` según la lógica del dominio (un ciclo de curso se asigna a una iglesia, no a un ministerio). Confirma con el equipo si debe ser `iglesia` o `ministerio` antes de ejecutar.

---

## ✅ Lista de verificación post-instalación

El agente debe confirmar cada ítem antes de declarar la tarea completada:

- [ ] 13 tipos ENUM creados (`\dT` en psql o PASO 11D)
- [ ] Función `trigger_set_updated_at()` creada
- [ ] 24 tablas creadas en schema `public`
- [ ] 35 foreign keys activas
- [ ] 23 triggers `set_updated_at_*` activos
- [ ] RLS habilitado en las 24 tablas (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] Políticas base creadas en todas las tablas
- [ ] Índices de optimización creados
- [ ] Consulta de verificación del PASO 11A retorna `24`
- [ ] Consulta del PASO 11C retorna `35` filas

---

*Documento generado para IGLESIABD v3.0 — Esquema relacional normalizado para gestión integral de iglesias.*
