-- ============================================================
-- MIGRACIÓN: Sistema de Evaluaciones con Preguntas y Opciones
-- Fecha: 2026-04-24
-- 
-- RESUMEN:
--   1. La tabla "evaluacion" actual (por usuario) se renombra a
--      "resultado_evaluacion" — conserva el historial de notas.
--   2. Se crea una nueva "evaluacion" limpia (plantilla por módulo).
--   3. Se añaden: pregunta, opcion_respuesta, evaluacion_intento,
--      respuesta_evaluacion.
-- ============================================================


-- ----------------------------------------------------------------
-- PASO 1: Renombrar tabla actual → resultado_evaluacion
-- ----------------------------------------------------------------
ALTER TABLE public.evaluacion RENAME TO resultado_evaluacion;

ALTER SEQUENCE IF EXISTS evaluacion_id_evaluacion_seq
  RENAME TO resultado_evaluacion_id_resultado_seq;

ALTER TABLE public.resultado_evaluacion
  RENAME CONSTRAINT evaluacion_pkey TO resultado_evaluacion_pkey;

ALTER TABLE public.resultado_evaluacion
  RENAME CONSTRAINT evaluacion_id_modulo_fkey TO resultado_evaluacion_id_modulo_fkey;

ALTER TABLE public.resultado_evaluacion
  RENAME CONSTRAINT evaluacion_id_usuario_fkey TO resultado_evaluacion_id_usuario_fkey;


-- ----------------------------------------------------------------
-- PASO 2: Nueva tabla evaluacion (plantilla del módulo)
-- SIN id_usuario — es la definición de la evaluación, no el resultado
-- ----------------------------------------------------------------
CREATE TABLE public.evaluacion (
  id_evaluacion   BIGSERIAL       PRIMARY KEY,
  id_modulo       BIGINT          NOT NULL
                    REFERENCES public.modulo(id_modulo) ON DELETE CASCADE,
  titulo          VARCHAR(300)    NOT NULL,
  descripcion     TEXT,
  puntaje_minimo  NUMERIC(5,2)    NOT NULL DEFAULT 60,    -- % mínimo para aprobar
  max_intentos    INT             NOT NULL DEFAULT 3,
  activo          BOOLEAN         NOT NULL DEFAULT true,
  creado_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evaluacion_modulo ON public.evaluacion(id_modulo);


-- ----------------------------------------------------------------
-- PASO 3: Vincular resultado_evaluacion con la nueva evaluacion
-- ----------------------------------------------------------------
ALTER TABLE public.resultado_evaluacion
  ADD COLUMN id_evaluacion_ref BIGINT
    REFERENCES public.evaluacion(id_evaluacion);


-- ----------------------------------------------------------------
-- PASO 4: Tabla pregunta
-- Las preguntas son de la evaluación (plantilla), no del alumno
-- ----------------------------------------------------------------
CREATE TABLE public.pregunta (
  id_pregunta     BIGSERIAL       PRIMARY KEY,
  id_evaluacion   BIGINT          NOT NULL
                    REFERENCES public.evaluacion(id_evaluacion) ON DELETE CASCADE,
  titulo          VARCHAR(500)    NOT NULL,
  descripcion     TEXT,
  tipo            VARCHAR(30)     NOT NULL DEFAULT 'multiple_choice'
                    CHECK (tipo IN ('multiple_choice', 'verdadero_falso', 'abierta')),
  orden           INT             NOT NULL CHECK (orden > 0),
  activo          BOOLEAN         NOT NULL DEFAULT true,
  creado_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE (id_evaluacion, orden)
);

CREATE INDEX idx_pregunta_evaluacion ON public.pregunta(id_evaluacion);


-- ----------------------------------------------------------------
-- PASO 5: Tabla opcion_respuesta
-- ----------------------------------------------------------------
CREATE TABLE public.opcion_respuesta (
  id_opcion       BIGSERIAL       PRIMARY KEY,
  id_pregunta     BIGINT          NOT NULL
                    REFERENCES public.pregunta(id_pregunta) ON DELETE CASCADE,
  texto_opcion    VARCHAR(500)    NOT NULL,
  es_correcta     BOOLEAN         NOT NULL DEFAULT false,
  puntos          NUMERIC(5,2)    NOT NULL DEFAULT 0 CHECK (puntos >= 0),
  orden           INT             NOT NULL CHECK (orden > 0),  -- 1=A  2=B  3=C  4=D
  creado_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE (id_pregunta, orden)
);

CREATE INDEX idx_opcion_pregunta ON public.opcion_respuesta(id_pregunta);


-- ----------------------------------------------------------------
-- PASO 6: Tabla evaluacion_intento
-- Cada vez que un usuario empieza a resolver una evaluación
-- ----------------------------------------------------------------
CREATE TABLE public.evaluacion_intento (
  id_intento        BIGSERIAL       PRIMARY KEY,
  id_evaluacion     BIGINT          NOT NULL
                      REFERENCES public.evaluacion(id_evaluacion),
  id_usuario        BIGINT          NOT NULL
                      REFERENCES public.usuario(id_usuario),
  numero_intento    INT             NOT NULL DEFAULT 1 CHECK (numero_intento > 0),
  fecha_inicio      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  fecha_fin         TIMESTAMPTZ,
  estado            VARCHAR(20)     NOT NULL DEFAULT 'en_progreso'
                      CHECK (estado IN ('en_progreso', 'completado', 'abandonado')),
  puntaje_total     NUMERIC(5,2),
  puntaje_maximo    NUMERIC(5,2),
  porcentaje        NUMERIC(5,2)
                      CHECK (porcentaje IS NULL OR (porcentaje >= 0 AND porcentaje <= 100)),
  tiempo_duracion   INT,            -- segundos que tardó
  creado_en         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE (id_evaluacion, id_usuario, numero_intento)
);

CREATE INDEX idx_intento_usuario ON public.evaluacion_intento(id_usuario, id_evaluacion);


-- ----------------------------------------------------------------
-- PASO 7: Tabla respuesta_evaluacion
-- Qué opción eligió el usuario en cada pregunta de un intento
-- ----------------------------------------------------------------
CREATE TABLE public.respuesta_evaluacion (
  id_respuesta        BIGSERIAL       PRIMARY KEY,
  id_intento          BIGINT          NOT NULL
                        REFERENCES public.evaluacion_intento(id_intento) ON DELETE CASCADE,
  id_pregunta         BIGINT          NOT NULL
                        REFERENCES public.pregunta(id_pregunta),
  id_opcion_selected  BIGINT
                        REFERENCES public.opcion_respuesta(id_opcion),
  puntos_obtenidos    NUMERIC(5,2)    DEFAULT 0 CHECK (puntos_obtenidos >= 0),
  respondido_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  -- Un usuario solo puede responder una vez por pregunta dentro del mismo intento
  UNIQUE (id_intento, id_pregunta)
);

CREATE INDEX idx_respuesta_intento  ON public.respuesta_evaluacion(id_intento);
CREATE INDEX idx_respuesta_pregunta ON public.respuesta_evaluacion(id_pregunta);


-- ----------------------------------------------------------------
-- PASO 8: Función y triggers updated_at
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_evaluacion_updated_at
  BEFORE UPDATE ON public.evaluacion
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_pregunta_updated_at
  BEFORE UPDATE ON public.pregunta
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_opcion_updated_at
  BEFORE UPDATE ON public.opcion_respuesta
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ----------------------------------------------------------------
-- PASO 9: Row Level Security
-- ----------------------------------------------------------------
ALTER TABLE public.evaluacion           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pregunta             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opcion_respuesta     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluacion_intento   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respuesta_evaluacion ENABLE ROW LEVEL SECURITY;

-- evaluacion: visible si el usuario está inscrito en el curso del módulo
CREATE POLICY evaluacion_select
ON public.evaluacion FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.modulo m
    JOIN public.curso c              ON c.id_curso  = m.id_curso
    JOIN public.proceso_asignado_curso pac ON pac.id_curso = c.id_curso
    JOIN public.detalle_proceso_curso dpc
      ON dpc.id_proceso_asignado_curso = pac.id_proceso_asignado_curso
    JOIN public.usuario u            ON u.id_usuario = dpc.id_usuario
    WHERE m.id_modulo = evaluacion.id_modulo
      AND u.auth_user_id = auth.uid()
  )
);

-- pregunta: heredar acceso de su evaluacion
CREATE POLICY pregunta_select
ON public.pregunta FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.evaluacion e
    JOIN public.modulo m             ON m.id_modulo = e.id_modulo
    JOIN public.curso c              ON c.id_curso  = m.id_curso
    JOIN public.proceso_asignado_curso pac ON pac.id_curso = c.id_curso
    JOIN public.detalle_proceso_curso dpc
      ON dpc.id_proceso_asignado_curso = pac.id_proceso_asignado_curso
    JOIN public.usuario u            ON u.id_usuario = dpc.id_usuario
    WHERE e.id_evaluacion = pregunta.id_evaluacion
      AND u.auth_user_id = auth.uid()
  )
);

-- opcion_respuesta: visible si la pregunta es visible
CREATE POLICY opcion_respuesta_select
ON public.opcion_respuesta FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.pregunta p
    WHERE p.id_pregunta = opcion_respuesta.id_pregunta
      AND p.activo = true
  )
);

-- evaluacion_intento: cada usuario solo ve los suyos
CREATE POLICY intento_select
ON public.evaluacion_intento FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.usuario u
    WHERE u.id_usuario = evaluacion_intento.id_usuario
      AND u.auth_user_id = auth.uid()
  )
);

CREATE POLICY intento_insert
ON public.evaluacion_intento FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuario u
    WHERE u.id_usuario = evaluacion_intento.id_usuario
      AND u.auth_user_id = auth.uid()
  )
);

CREATE POLICY intento_update
ON public.evaluacion_intento FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.usuario u
    WHERE u.id_usuario = evaluacion_intento.id_usuario
      AND u.auth_user_id = auth.uid()
  )
);

-- respuesta_evaluacion: cada usuario gestiona las suyas
CREATE POLICY respuesta_select
ON public.respuesta_evaluacion FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.evaluacion_intento ei
    JOIN public.usuario u ON u.id_usuario = ei.id_usuario
    WHERE ei.id_intento = respuesta_evaluacion.id_intento
      AND u.auth_user_id = auth.uid()
  )
);

CREATE POLICY respuesta_insert
ON public.respuesta_evaluacion FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.evaluacion_intento ei
    JOIN public.usuario u ON u.id_usuario = ei.id_usuario
    WHERE ei.id_intento = respuesta_evaluacion.id_intento
      AND u.auth_user_id = auth.uid()
  )
);


-- ----------------------------------------------------------------
-- PASO 10: Comentarios de documentación
-- ----------------------------------------------------------------
COMMENT ON TABLE public.evaluacion IS
  'Plantilla de evaluación asociada a un módulo. Define preguntas y configuración. NO almacena resultados de usuarios.';

COMMENT ON TABLE public.resultado_evaluacion IS
  'Resultado final de un usuario en una evaluación. Tabla original renombrada desde "evaluacion".';

COMMENT ON TABLE public.pregunta IS
  'Preguntas de una evaluación. Pertenecen a la plantilla (evaluacion), no al usuario.';

COMMENT ON TABLE public.opcion_respuesta IS
  'Opciones de respuesta por pregunta. es_correcta y puntos determinan la calificación automática.';

COMMENT ON TABLE public.evaluacion_intento IS
  'Cada intento de un usuario al resolver una evaluación. Registra puntaje, tiempo y estado.';

COMMENT ON TABLE public.respuesta_evaluacion IS
  'Opción seleccionada por el usuario para cada pregunta dentro de un intento específico.';
