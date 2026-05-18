DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'hoja_de_vida'
  ) THEN
    RAISE EXCEPTION 'tabla hoja_de_vida no existe';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.hoja_de_vida_revision (
  id_revision BIGSERIAL PRIMARY KEY,
  id_hoja_de_vida BIGINT NOT NULL REFERENCES public.hoja_de_vida(id_hoja_de_vida) ON DELETE CASCADE,
  id_revisor BIGINT NOT NULL REFERENCES public.usuario(id_usuario),
  rol_revisor TEXT NOT NULL,
  estado_revision TEXT NOT NULL CHECK (estado_revision IN ('pendiente', 'aprobada', 'observada')),
  observaciones TEXT,
  revisado_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hoja_de_vida_etiqueta (
  id_etiqueta BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  categoria TEXT NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hoja_de_vida_etiqueta_usuario (
  id_hoja_de_vida BIGINT NOT NULL REFERENCES public.hoja_de_vida(id_hoja_de_vida) ON DELETE CASCADE,
  id_etiqueta BIGINT NOT NULL REFERENCES public.hoja_de_vida_etiqueta(id_etiqueta),
  asignada_por BIGINT NOT NULL REFERENCES public.usuario(id_usuario),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id_hoja_de_vida, id_etiqueta)
);

CREATE TABLE IF NOT EXISTS public.hoja_de_vida_disponibilidad (
  id_disponibilidad BIGSERIAL PRIMARY KEY,
  id_hoja_de_vida BIGINT NOT NULL REFERENCES public.hoja_de_vida(id_hoja_de_vida) ON DELETE CASCADE,
  id_sede BIGINT NOT NULL REFERENCES public.sede(id_sede),
  id_ministerio BIGINT REFERENCES public.ministerio(id_ministerio),
  dias_semana JSONB NOT NULL DEFAULT '[]'::jsonb,
  franja_horaria TEXT NOT NULL,
  modalidad TEXT NOT NULL CHECK (modalidad IN ('presencial', 'virtual', 'mixta')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hoja_de_vida_disponibilidad_dias_semana_array_chk CHECK (jsonb_typeof(dias_semana) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_hdv_revision_hoja ON public.hoja_de_vida_revision(id_hoja_de_vida);
CREATE INDEX IF NOT EXISTS idx_hdv_revision_estado ON public.hoja_de_vida_revision(estado_revision);
CREATE INDEX IF NOT EXISTS idx_hdv_revision_revisor ON public.hoja_de_vida_revision(id_revisor);
CREATE INDEX IF NOT EXISTS idx_hdv_disponibilidad_sede_activo ON public.hoja_de_vida_disponibilidad(id_sede, activo);
CREATE INDEX IF NOT EXISTS idx_hdv_disponibilidad_hoja ON public.hoja_de_vida_disponibilidad(id_hoja_de_vida);
CREATE INDEX IF NOT EXISTS idx_hdv_etiqueta_categoria ON public.hoja_de_vida_etiqueta(categoria);
CREATE INDEX IF NOT EXISTS idx_hdv_etiqueta_usuario_etiqueta ON public.hoja_de_vida_etiqueta_usuario(id_etiqueta);

CREATE OR REPLACE FUNCTION public.set_actualizado_en_hdv_decision_tables()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.actualizado_en := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_actualizado_en_hdv_revision ON public.hoja_de_vida_revision;
CREATE TRIGGER set_actualizado_en_hdv_revision
BEFORE UPDATE ON public.hoja_de_vida_revision
FOR EACH ROW
EXECUTE FUNCTION public.set_actualizado_en_hdv_decision_tables();

DROP TRIGGER IF EXISTS set_actualizado_en_hdv_disponibilidad ON public.hoja_de_vida_disponibilidad;
CREATE TRIGGER set_actualizado_en_hdv_disponibilidad
BEFORE UPDATE ON public.hoja_de_vida_disponibilidad
FOR EACH ROW
EXECUTE FUNCTION public.set_actualizado_en_hdv_decision_tables();
