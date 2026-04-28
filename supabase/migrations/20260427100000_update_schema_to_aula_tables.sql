-- Migration: Update schema to current aula tables
-- Date: 2026-04-27
-- Purpose: Refactor formation module to aula_ prefixed tables with updated structure

-- Create sequences for aula tables
CREATE SEQUENCE IF NOT EXISTS aula_actividad_id_seq;
CREATE SEQUENCE IF NOT EXISTS aula_certificado_id_seq;
CREATE SEQUENCE IF NOT EXISTS aula_curso_id_seq;
CREATE SEQUENCE IF NOT EXISTS aula_evaluacion_id_seq;
CREATE SEQUENCE IF NOT EXISTS aula_inscripcion_id_seq;
CREATE SEQUENCE IF NOT EXISTS aula_intento_evaluacion_id_seq;
CREATE SEQUENCE IF NOT EXISTS aula_modulo_id_seq;
CREATE SEQUENCE IF NOT EXISTS aula_opcion_id_seq;
CREATE SEQUENCE IF NOT EXISTS aula_pregunta_id_seq;
CREATE SEQUENCE IF NOT EXISTS aula_progreso_actividad_id_seq;
CREATE SEQUENCE IF NOT EXISTS aula_respuesta_id_seq;
CREATE SEQUENCE IF NOT EXISTS aula_retroalimentacion_id_seq;

-- Migrate data from old tables to new tables
INSERT INTO public.aula_curso (id_aula_curso, id_ministerio, id_usuario_creador, titulo, descripcion, imagen_url, estado, orden_secuencial, creado_en, updated_at)
SELECT id_curso, id_ministerio, id_usuario_creador, nombre, descripcion, NULL, estado, desbloqueo_secuencial, creado_en, updated_at
FROM public.curso
ON CONFLICT DO NOTHING;

INSERT INTO public.aula_modulo (id_aula_modulo, id_aula_curso, titulo, descripcion, orden, publicado, creado_en, updated_at)
SELECT m.id_modulo, m.id_curso, m.titulo, m.descripcion, m.orden, CASE WHEN m.estado = 'publicado' THEN true ELSE false END, m.creado_en, m.updated_at
FROM public.modulo m
JOIN public.aula_curso ac ON ac.id_aula_curso = m.id_curso
ON CONFLICT DO NOTHING;

INSERT INTO public.aula_inscripcion (id_aula_inscripcion, id_aula_curso, id_usuario, activo, inscrito_en, updated_at)
SELECT d.id_detalle_proceso_curso, d.id_proceso_asignado_curso, d.id_usuario, CASE WHEN d.estado IN ('inscrito','en_progreso','completado') THEN true ELSE false END, d.fecha_inscripcion, d.updated_at
FROM public.detalle_proceso_curso d
JOIN public.proceso_asignado_curso pac ON pac.id_proceso_asignado_curso = d.id_proceso_asignado_curso
JOIN public.aula_curso ac ON ac.id_aula_curso = pac.id_curso
ON CONFLICT DO NOTHING;

INSERT INTO public.aula_progreso_actividad (id_aula_progreso_actividad, id_usuario, id_aula_actividad, completada, completada_en, creado_en, updated_at)
SELECT am.id_avance, am.id_usuario, NULL, true, am.completado_en, am.creado_en, am.updated_at
FROM public.avance_modulo am
WHERE NOT EXISTS (SELECT 1 FROM public.aula_actividad aa WHERE aa.id_aula_modulo = am.id_modulo)
ON CONFLICT DO NOTHING;

-- Migrate evaluations if they exist
INSERT INTO public.aula_evaluacion (id_aula_evaluacion, id_aula_modulo, titulo, descripcion, puntaje_minimo, reintentos_permitidos, max_intentos, orden, creado_en, updated_at)
SELECT e.id_evaluacion, e.id_modulo, 'Evaluación', NULL, 60, true, NULL, 1, e.creado_en, e.updated_at
FROM public.evaluacion e
JOIN public.aula_modulo am ON am.id_aula_modulo = e.id_modulo
ON CONFLICT DO NOTHING;

INSERT INTO public.aula_pregunta (id_aula_pregunta, id_aula_evaluacion, enunciado, tipo, orden, puntaje, creado_en)
SELECT p.id_pregunta, ae.id_aula_evaluacion, p.enunciado, CASE WHEN p.tipo = 'multiple_choice' THEN 'opcion_multiple' ELSE p.tipo END, p.orden, p.puntaje, p.creado_en
FROM public.pregunta p
JOIN public.evaluacion e ON e.id_evaluacion = p.id_evaluacion
JOIN public.aula_evaluacion ae ON ae.id_aula_evaluacion = e.id_evaluacion
ON CONFLICT DO NOTHING;

INSERT INTO public.aula_opcion (id_aula_opcion, id_aula_pregunta, texto, es_correcta, orden)
SELECT o.id_opcion, ap.id_aula_pregunta, o.texto, o.es_correcta, o.orden
FROM public.opcion_respuesta o
JOIN public.pregunta p ON p.id_pregunta = o.id_pregunta
JOIN public.aula_pregunta ap ON ap.id_aula_pregunta = p.id_pregunta
ON CONFLICT DO NOTHING;

INSERT INTO public.aula_intento_evaluacion (id_aula_intento_evaluacion, id_usuario, id_aula_evaluacion, puntaje_obtenido, aprobado, numero_intento, iniciado_en, finalizado_en, creado_en)
SELECT ei.id_intento, ei.id_usuario, ae.id_aula_evaluacion, ei.puntaje, ei.aprobado, ei.numero_intento, ei.iniciado_en, ei.finalizado_en, ei.creado_en
FROM public.evaluacion_intento ei
JOIN public.evaluacion e ON e.id_evaluacion = ei.id_evaluacion
JOIN public.aula_evaluacion ae ON ae.id_aula_evaluacion = e.id_evaluacion
ON CONFLICT DO NOTHING;

INSERT INTO public.aula_respuesta (id_aula_respuesta, id_aula_intento_evaluacion, id_aula_pregunta, id_aula_opcion, respuesta_texto, es_correcta)
SELECT re.id_respuesta, aie.id_aula_intento_evaluacion, ap.id_aula_pregunta, ao.id_aula_opcion, re.respuesta_texto, re.es_correcta
FROM public.respuesta_evaluacion re
JOIN public.evaluacion_intento ei ON ei.id_intento = re.id_intento
JOIN public.aula_intento_evaluacion aie ON aie.id_aula_intento_evaluacion = ei.id_intento
JOIN public.pregunta p ON p.id_pregunta = re.id_pregunta
JOIN public.aula_pregunta ap ON ap.id_aula_pregunta = p.id_pregunta
LEFT JOIN public.opcion_respuesta o ON o.id_opcion = re.id_opcion
LEFT JOIN public.aula_opcion ao ON ao.id_aula_opcion = o.id_opcion
ON CONFLICT DO NOTHING;

-- Drop old tables after migration
DROP TABLE IF EXISTS public.avance_modulo CASCADE;
DROP TABLE IF EXISTS public.detalle_proceso_curso CASCADE;
DROP TABLE IF EXISTS public.proceso_asignado_curso CASCADE;
DROP TABLE IF EXISTS public.modulo CASCADE;
DROP TABLE IF EXISTS public.curso CASCADE;
DROP TABLE IF EXISTS public.respuesta_evaluacion CASCADE;
DROP TABLE IF EXISTS public.evaluacion_intento CASCADE;
DROP TABLE IF EXISTS public.opcion_respuesta CASCADE;
DROP TABLE IF EXISTS public.pregunta CASCADE;
DROP TABLE IF EXISTS public.evaluacion CASCADE;

-- Create new aula tables
CREATE TABLE IF NOT EXISTS public.aula_actividad (
  id_aula_actividad bigint NOT NULL DEFAULT nextval('aula_actividad_id_seq'::regclass),
  id_aula_modulo bigint NOT NULL,
  titulo character varying NOT NULL,
  tipo character varying NOT NULL DEFAULT 'lectura'::character varying CHECK (tipo::text = ANY (ARRAY['lectura'::character varying, 'video'::character varying, 'recurso'::character varying, 'otro'::character varying]::text[])),
  contenido text,
  url_recurso character varying,
  orden integer NOT NULL DEFAULT 1,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT aula_actividad_pkey PRIMARY KEY (id_aula_actividad),
  CONSTRAINT aula_actividad_id_aula_modulo_fkey FOREIGN KEY (id_aula_modulo) REFERENCES public.aula_modulo(id_aula_modulo)
);

CREATE TABLE IF NOT EXISTS public.aula_certificado (
  id_aula_certificado bigint NOT NULL DEFAULT nextval('aula_certificado_id_seq'::regclass),
  id_usuario bigint NOT NULL,
  id_aula_curso bigint NOT NULL,
  codigo_verificacion character varying DEFAULT encode(gen_random_bytes(12), 'hex'::text) UNIQUE,
  emitido_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT aula_certificado_pkey PRIMARY KEY (id_aula_certificado),
  CONSTRAINT aula_certificado_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario),
  CONSTRAINT aula_certificado_id_aula_curso_fkey FOREIGN KEY (id_aula_curso) REFERENCES public.aula_curso(id_aula_curso)
);

CREATE TABLE IF NOT EXISTS public.aula_curso (
  id_aula_curso bigint NOT NULL DEFAULT nextval('aula_curso_id_seq'::regclass),
  id_ministerio bigint NOT NULL,
  id_usuario_creador bigint NOT NULL,
  titulo character varying NOT NULL,
  descripcion text,
  imagen_url character varying,
  estado character varying NOT NULL DEFAULT 'borrador'::character varying CHECK (estado::text = ANY (ARRAY['borrador'::character varying, 'activo'::character varying, 'archivado'::character varying]::text[])),
  orden_secuencial boolean NOT NULL DEFAULT true,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT aula_curso_pkey PRIMARY KEY (id_aula_curso),
  CONSTRAINT aula_curso_id_ministerio_fkey FOREIGN KEY (id_ministerio) REFERENCES public.ministerio(id_ministerio),
  CONSTRAINT aula_curso_id_usuario_creador_fkey FOREIGN KEY (id_usuario_creador) REFERENCES public.usuario(id_usuario)
);

CREATE TABLE IF NOT EXISTS public.aula_evaluacion (
  id_aula_evaluacion bigint NOT NULL DEFAULT nextval('aula_evaluacion_id_seq'::regclass),
  id_aula_modulo bigint NOT NULL,
  titulo character varying NOT NULL,
  descripcion text,
  puntaje_minimo integer NOT NULL DEFAULT 60 CHECK (puntaje_minimo >= 0 AND puntaje_minimo <= 100),
  reintentos_permitidos boolean NOT NULL DEFAULT true,
  max_intentos integer,
  orden integer NOT NULL DEFAULT 1,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT aula_evaluacion_pkey PRIMARY KEY (id_aula_evaluacion),
  CONSTRAINT aula_evaluacion_id_aula_modulo_fkey FOREIGN KEY (id_aula_modulo) REFERENCES public.aula_modulo(id_aula_modulo)
);

CREATE TABLE IF NOT EXISTS public.aula_inscripcion (
  id_aula_inscripcion bigint NOT NULL DEFAULT nextval('aula_inscripcion_id_seq'::regclass),
  id_aula_curso bigint NOT NULL,
  id_usuario bigint NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  inscrito_en timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT aula_inscripcion_pkey PRIMARY KEY (id_aula_inscripcion),
  CONSTRAINT aula_inscripcion_id_aula_curso_fkey FOREIGN KEY (id_aula_curso) REFERENCES public.aula_curso(id_aula_curso),
  CONSTRAINT aula_inscripcion_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);

CREATE TABLE IF NOT EXISTS public.aula_intento_evaluacion (
  id_aula_intento_evaluacion bigint NOT NULL DEFAULT nextval('aula_intento_evaluacion_id_seq'::regclass),
  id_usuario bigint NOT NULL,
  id_aula_evaluacion bigint NOT NULL,
  puntaje_obtenido integer NOT NULL DEFAULT 0 CHECK (puntaje_obtenido >= 0 AND puntaje_obtenido <= 100),
  aprobado boolean NOT NULL DEFAULT false,
  numero_intento integer NOT NULL DEFAULT 1,
  iniciado_en timestamp with time zone NOT NULL DEFAULT now(),
  finalizado_en timestamp with time zone,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT aula_intento_evaluacion_pkey PRIMARY KEY (id_aula_intento_evaluacion),
  CONSTRAINT aula_intento_evaluacion_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario),
  CONSTRAINT aula_intento_evaluacion_id_aula_evaluacion_fkey FOREIGN KEY (id_aula_evaluacion) REFERENCES public.aula_evaluacion(id_aula_evaluacion)
);

CREATE TABLE IF NOT EXISTS public.aula_modulo (
  id_aula_modulo bigint NOT NULL DEFAULT nextval('aula_modulo_id_seq'::regclass),
  id_aula_curso bigint NOT NULL,
  titulo character varying NOT NULL,
  descripcion text,
  orden integer NOT NULL DEFAULT 1,
  publicado boolean NOT NULL DEFAULT false,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT aula_modulo_pkey PRIMARY KEY (id_aula_modulo),
  CONSTRAINT aula_modulo_id_aula_curso_fkey FOREIGN KEY (id_aula_curso) REFERENCES public.aula_curso(id_aula_curso)
);

CREATE TABLE IF NOT EXISTS public.aula_opcion (
  id_aula_opcion bigint NOT NULL DEFAULT nextval('aula_opcion_id_seq'::regclass),
  id_aula_pregunta bigint NOT NULL,
  texto text NOT NULL,
  es_correcta boolean NOT NULL DEFAULT false,
  orden integer NOT NULL DEFAULT 1,
  CONSTRAINT aula_opcion_pkey PRIMARY KEY (id_aula_opcion),
  CONSTRAINT aula_opcion_id_aula_pregunta_fkey FOREIGN KEY (id_aula_pregunta) REFERENCES public.aula_pregunta(id_aula_pregunta)
);

CREATE TABLE IF NOT EXISTS public.aula_pregunta (
  id_aula_pregunta bigint NOT NULL DEFAULT nextval('aula_pregunta_id_seq'::regclass),
  id_aula_evaluacion bigint NOT NULL,
  enunciado text NOT NULL,
  tipo character varying NOT NULL DEFAULT 'opcion_multiple'::character varying CHECK (tipo::text = ANY (ARRAY['opcion_multiple'::character varying, 'verdadero_falso'::character varying, 'respuesta_corta'::character varying]::text[])),
  orden integer NOT NULL DEFAULT 1,
  puntaje integer NOT NULL DEFAULT 1,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT aula_pregunta_pkey PRIMARY KEY (id_aula_pregunta),
  CONSTRAINT aula_pregunta_id_aula_evaluacion_fkey FOREIGN KEY (id_aula_evaluacion) REFERENCES public.aula_evaluacion(id_aula_evaluacion)
);

CREATE TABLE IF NOT EXISTS public.aula_progreso_actividad (
  id_aula_progreso_actividad bigint NOT NULL DEFAULT nextval('aula_progreso_actividad_id_seq'::regclass),
  id_usuario bigint NOT NULL,
  id_aula_actividad bigint NOT NULL,
  completada boolean NOT NULL DEFAULT false,
  completada_en timestamp with time zone,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT aula_progreso_actividad_pkey PRIMARY KEY (id_aula_progreso_actividad),
  CONSTRAINT aula_progreso_actividad_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario),
  CONSTRAINT aula_progreso_actividad_id_aula_actividad_fkey FOREIGN KEY (id_aula_actividad) REFERENCES public.aula_actividad(id_aula_actividad)
);

CREATE TABLE IF NOT EXISTS public.aula_respuesta (
  id_aula_respuesta bigint NOT NULL DEFAULT nextval('aula_respuesta_id_seq'::regclass),
  id_aula_intento_evaluacion bigint NOT NULL,
  id_aula_pregunta bigint NOT NULL,
  id_aula_opcion bigint,
  respuesta_texto text,
  es_correcta boolean NOT NULL DEFAULT false,
  CONSTRAINT aula_respuesta_pkey PRIMARY KEY (id_aula_respuesta),
  CONSTRAINT aula_respuesta_id_aula_intento_fkey FOREIGN KEY (id_aula_intento_evaluacion) REFERENCES public.aula_intento_evaluacion(id_aula_intento_evaluacion),
  CONSTRAINT aula_respuesta_id_aula_pregunta_fkey FOREIGN KEY (id_aula_pregunta) REFERENCES public.aula_pregunta(id_aula_pregunta),
  CONSTRAINT aula_respuesta_id_aula_opcion_fkey FOREIGN KEY (id_aula_opcion) REFERENCES public.aula_opcion(id_aula_opcion)
);

CREATE TABLE IF NOT EXISTS public.aula_retroalimentacion (
  id_aula_retroalimentacion bigint NOT NULL DEFAULT nextval('aula_retroalimentacion_id_seq'::regclass),
  id_usuario_lider bigint NOT NULL,
  id_usuario_servidor bigint NOT NULL,
  id_aula_actividad bigint,
  id_aula_evaluacion bigint,
  comentario text NOT NULL,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT aula_retroalimentacion_pkey PRIMARY KEY (id_aula_retroalimentacion),
  CONSTRAINT aula_retroalimentacion_lider_fkey FOREIGN KEY (id_usuario_lider) REFERENCES public.usuario(id_usuario),
  CONSTRAINT aula_retroalimentacion_servidor_fkey FOREIGN KEY (id_usuario_servidor) REFERENCES public.usuario(id_usuario),
  CONSTRAINT aula_retroalimentacion_actividad_fkey FOREIGN KEY (id_aula_actividad) REFERENCES public.aula_actividad(id_aula_actividad),
  CONSTRAINT aula_retroalimentacion_evaluacion_fkey FOREIGN KEY (id_aula_evaluacion) REFERENCES public.aula_evaluacion(id_aula_evaluacion)
);

-- Enable RLS on aula tables
ALTER TABLE public.aula_actividad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aula_certificado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aula_curso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aula_evaluacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aula_inscripcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aula_intento_evaluacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aula_modulo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aula_opcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aula_pregunta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aula_progreso_actividad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aula_respuesta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aula_retroalimentacion ENABLE ROW LEVEL SECURITY;

-- RLS Policies for aula_curso (adapted from old curso policies)
DROP POLICY IF EXISTS "Super admin can manage all cursos" ON public.aula_curso;
CREATE POLICY "Super admin can manage all cursos" ON public.aula_curso
  FOR ALL TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Admin iglesia can manage cursos in their iglesia" ON public.aula_curso;
CREATE POLICY "Admin iglesia can manage cursos in their iglesia" ON public.aula_curso
  FOR ALL TO authenticated
  USING (
    public.is_admin_of_iglesia(
      (SELECT id_iglesia FROM public.sede s
       JOIN public.ministerio m ON m.id_sede = s.id_sede
       WHERE m.id_ministerio = aula_curso.id_ministerio)
    )
  );

DROP POLICY IF EXISTS "Lider can manage cursos in their ministerios" ON public.aula_curso;
CREATE POLICY "Lider can manage cursos in their ministerios" ON public.aula_curso
  FOR ALL TO authenticated
  USING (
    aula_curso.id_ministerio IN (
      SELECT m.id_ministerio FROM public.ministerio m
      JOIN public.miembro_ministerio mm ON mm.id_ministerio = m.id_ministerio
      WHERE mm.id_usuario = public.current_usuario_id()
        AND mm.rol_en_ministerio = 'Líder'
        AND mm.fecha_salida IS NULL
    )
  );

DROP POLICY IF EXISTS "Authenticated can read active cursos" ON public.aula_curso;
CREATE POLICY "Authenticated can read active cursos" ON public.aula_curso
  FOR SELECT TO authenticated
  USING (estado = 'activo' OR aula_curso.id_usuario_creador = public.current_usuario_id());

-- RLS Policies for aula_modulo
DROP POLICY IF EXISTS "Super admin can manage all modulos" ON public.aula_modulo;
CREATE POLICY "Super admin can manage all modulos" ON public.aula_modulo
  FOR ALL TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Admin iglesia can manage modulos in their iglesia" ON public.aula_modulo;
CREATE POLICY "Admin iglesia can manage modulos in their iglesia" ON public.aula_modulo
  FOR ALL TO authenticated
  USING (
    public.is_admin_of_iglesia(
      (SELECT id_iglesia FROM public.aula_curso ac
       WHERE ac.id_aula_curso = aula_modulo.id_aula_curso)
    )
  );

DROP POLICY IF EXISTS "Lider can manage modulos in their cursos" ON public.aula_modulo;
CREATE POLICY "Lider can manage modulos in their cursos" ON public.aula_modulo
  FOR ALL TO authenticated
  USING (
    aula_modulo.id_aula_curso IN (
      SELECT ac.id_aula_curso FROM public.aula_curso ac
      WHERE ac.id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        JOIN public.miembro_ministerio mm ON mm.id_ministerio = m.id_ministerio
        WHERE mm.id_usuario = public.current_usuario_id()
          AND mm.rol_en_ministerio = 'Líder'
          AND mm.fecha_salida IS NULL
      )
    )
  );

DROP POLICY IF EXISTS "Servidor can read modulos publicados in their cursos" ON public.aula_modulo;
CREATE POLICY "Servidor can read modulos publicados in their cursos" ON public.aula_modulo
  FOR SELECT TO authenticated
  USING (
    publicado = true
    AND aula_modulo.id_aula_curso IN (
      SELECT ac.id_aula_curso FROM public.aula_curso ac
      WHERE ac.id_ministerio IN (
        SELECT m.id_ministerio FROM public.ministerio m
        JOIN public.miembro_ministerio mm ON mm.id_ministerio = m.id_ministerio
        WHERE mm.id_usuario = public.current_usuario_id()
          AND mm.fecha_salida IS NULL
      )
    )
  );

-- RLS Policies for aula_progreso_actividad (adapted from avance_modulo)
DROP POLICY IF EXISTS "Lectura aula_progreso_actividad" ON public.aula_progreso_actividad;
CREATE POLICY "Lectura aula_progreso_actividad" ON public.aula_progreso_actividad
  FOR SELECT TO authenticated
  USING (
    id_usuario = public.current_usuario_id()
    OR EXISTS (
      SELECT 1 FROM public.aula_actividad aa
      WHERE aa.id_aula_actividad = aula_progreso_actividad.id_aula_actividad
        AND EXISTS (
          SELECT 1 FROM public.aula_modulo am
          WHERE am.id_aula_modulo = aa.id_aula_modulo
            AND am.id_aula_curso IN (
              SELECT ac.id_aula_curso FROM public.aula_curso ac
              WHERE ac.id_ministerio IN (
                SELECT m.id_ministerio FROM public.ministerio m
                JOIN public.miembro_ministerio mm ON mm.id_ministerio = m.id_ministerio
                WHERE mm.id_usuario = public.current_usuario_id()
                  AND mm.rol_en_ministerio = 'Líder'
                  AND mm.fecha_salida IS NULL
              )
            )
        )
    )
  );

DROP POLICY IF EXISTS "Insercion aula_progreso_actividad propio" ON public.aula_progreso_actividad;
CREATE POLICY "Insercion aula_progreso_actividad propio" ON public.aula_progreso_actividad
  FOR INSERT TO authenticated
  WITH CHECK (
    id_usuario = public.current_usuario_id()
    AND EXISTS (
      SELECT 1 FROM public.aula_inscripcion ai
      WHERE ai.id_aula_curso = (
        SELECT am.id_aula_curso FROM public.aula_modulo am
        JOIN public.aula_actividad aa ON aa.id_aula_modulo = am.id_aula_modulo
        WHERE aa.id_aula_actividad = aula_progreso_actividad.id_aula_actividad
      )
      AND ai.id_usuario = public.current_usuario_id()
      AND ai.activo = true
    )
    AND EXISTS (
      SELECT 1 FROM public.aula_modulo am
      WHERE am.id_aula_modulo = (
        SELECT aa.id_aula_modulo FROM public.aula_actividad aa
        WHERE aa.id_aula_actividad = aula_progreso_actividad.id_aula_actividad
      )
      AND am.publicado = true
    )
  );

-- Similar policies for other tables...
-- (Adding basic policies for completeness)

DROP POLICY IF EXISTS "Authenticated can read aula_actividad" ON public.aula_actividad;
CREATE POLICY "Authenticated can read aula_actividad" ON public.aula_actividad
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.aula_modulo am
      WHERE am.id_aula_modulo = aula_actividad.id_aula_modulo
        AND am.publicado = true
        AND am.id_aula_curso IN (
          SELECT ac.id_aula_curso FROM public.aula_curso ac
          WHERE ac.estado = 'activo'
        )
    )
  );

DROP POLICY IF EXISTS "Lider can manage aula_actividad" ON public.aula_actividad;
CREATE POLICY "Lider can manage aula_actividad" ON public.aula_actividad
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.aula_modulo am
      WHERE am.id_aula_modulo = aula_actividad.id_aula_modulo
        AND am.id_aula_curso IN (
          SELECT ac.id_aula_curso FROM public.aula_curso ac
          WHERE ac.id_ministerio IN (
            SELECT m.id_ministerio FROM public.ministerio m
            JOIN public.miembro_ministerio mm ON mm.id_ministerio = m.id_ministerio
            WHERE mm.id_usuario = public.current_usuario_id()
              AND mm.rol_en_ministerio = 'Líder'
              AND mm.fecha_salida IS NULL
          )
        )
    )
  );

-- Basic policies for evaluations, etc.
DROP POLICY IF EXISTS "Authenticated can read aula_evaluacion" ON public.aula_evaluacion;
CREATE POLICY "Authenticated can read aula_evaluacion" ON public.aula_evaluacion
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.aula_modulo am
      WHERE am.id_aula_modulo = aula_evaluacion.id_aula_modulo
        AND am.publicado = true
    )
  );

DROP POLICY IF EXISTS "Authenticated can read aula_inscripcion" ON public.aula_inscripcion;
CREATE POLICY "Authenticated can read aula_inscripcion" ON public.aula_inscripcion
  FOR SELECT TO authenticated
  USING (id_usuario = public.current_usuario_id());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_aula_actividad_modulo ON public.aula_actividad(id_aula_modulo);
CREATE INDEX IF NOT EXISTS idx_aula_certificado_usuario ON public.aula_certificado(id_usuario);
CREATE INDEX IF NOT EXISTS idx_aula_certificado_curso ON public.aula_certificado(id_aula_curso);
CREATE INDEX IF NOT EXISTS idx_aula_curso_ministerio ON public.aula_curso(id_ministerio);
CREATE INDEX IF NOT EXISTS idx_aula_evaluacion_modulo ON public.aula_evaluacion(id_aula_modulo);
CREATE INDEX IF NOT EXISTS idx_aula_inscripcion_curso ON public.aula_inscripcion(id_aula_curso);
CREATE INDEX IF NOT EXISTS idx_aula_inscripcion_usuario ON public.aula_inscripcion(id_usuario);
CREATE INDEX IF NOT EXISTS idx_aula_intento_evaluacion_usuario ON public.aula_intento_evaluacion(id_usuario);
CREATE INDEX IF NOT EXISTS idx_aula_intento_evaluacion_evaluacion ON public.aula_intento_evaluacion(id_aula_evaluacion);
CREATE INDEX IF NOT EXISTS idx_aula_modulo_curso ON public.aula_modulo(id_aula_curso);
CREATE INDEX IF NOT EXISTS idx_aula_opcion_pregunta ON public.aula_opcion(id_aula_pregunta);
CREATE INDEX IF NOT EXISTS idx_aula_pregunta_evaluacion ON public.aula_pregunta(id_aula_evaluacion);
CREATE INDEX IF NOT EXISTS idx_aula_progreso_actividad_usuario ON public.aula_progreso_actividad(id_usuario);
CREATE INDEX IF NOT EXISTS idx_aula_progreso_actividad_actividad ON public.aula_progreso_actividad(id_aula_actividad);
CREATE INDEX IF NOT EXISTS idx_aula_respuesta_intento ON public.aula_respuesta(id_aula_intento_evaluacion);
CREATE INDEX IF NOT EXISTS idx_aula_respuesta_pregunta ON public.aula_respuesta(id_aula_pregunta);
CREATE INDEX IF NOT EXISTS idx_aula_retroalimentacion_lider ON public.aula_retroalimentacion(id_usuario_lider);
CREATE INDEX IF NOT EXISTS idx_aula_retroalimentacion_servidor ON public.aula_retroalimentacion(id_usuario_servidor);