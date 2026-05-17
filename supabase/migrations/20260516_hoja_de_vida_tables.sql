-- Step 1: Create 4 new tables
CREATE TABLE IF NOT EXISTS public.hoja_de_vida_revision (
  id_revision       BIGSERIAL PRIMARY KEY,
  id_hoja_de_vida   BIGINT NOT NULL REFERENCES public.hoja_de_vida(id_hoja_de_vida) ON DELETE CASCADE,
  id_revisor        BIGINT NOT NULL REFERENCES public.usuario(id_usuario),
  rol_revisor       TEXT NOT NULL,
  estado_revision   TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (estado_revision IN ('pendiente', 'aprobada', 'observada')),
  observaciones     TEXT,
  revisado_en       TIMESTAMPTZ DEFAULT NOW(),
  creado_en         TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hoja_de_vida_etiqueta (
  id_etiqueta   BIGSERIAL PRIMARY KEY,
  nombre        TEXT NOT NULL UNIQUE,
  categoria     TEXT NOT NULL,
  activa        BOOLEAN DEFAULT true,
  creado_en     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hoja_de_vida_etiqueta_usuario (
  id_hoja_de_vida   BIGINT NOT NULL REFERENCES public.hoja_de_vida(id_hoja_de_vida) ON DELETE CASCADE,
  id_etiqueta       BIGINT NOT NULL REFERENCES public.hoja_de_vida_etiqueta(id_etiqueta) ON DELETE CASCADE,
  asignada_por      BIGINT REFERENCES public.usuario(id_usuario),
  creado_en         TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id_hoja_de_vida, id_etiqueta)
);

CREATE TABLE IF NOT EXISTS public.hoja_de_vida_disponibilidad (
  id_disponibilidad   BIGSERIAL PRIMARY KEY,
  id_hoja_de_vida     BIGINT NOT NULL REFERENCES public.hoja_de_vida(id_hoja_de_vida) ON DELETE CASCADE,
  id_sede             BIGINT REFERENCES public.sede(id_sede),
  id_ministerio       BIGINT REFERENCES public.ministerio(id_ministerio),
  dias_semana         TEXT[] DEFAULT '{}',
  franja_horaria      TEXT,
  modalidad           TEXT DEFAULT 'presencial'
                      CHECK (modalidad IN ('presencial', 'virtual', 'mixta')),
  activo              BOOLEAN DEFAULT true,
  creado_en           TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en      TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Enable RLS and add policies + helper functions
ALTER TABLE public.hoja_de_vida_revision        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoja_de_vida_etiqueta        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoja_de_vida_etiqueta_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoja_de_vida_disponibilidad  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public._current_app_user_id()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id_usuario FROM public.usuario WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public._is_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuario_rol ur
    JOIN public.rol r ON ur.id_rol = r.id_rol
    WHERE ur.id_usuario = public._current_app_user_id()
      AND r.nombre IN ('super_admin', 'admin_iglesia', 'admin_sede', 'lider')
      AND (ur.fecha_fin IS NULL OR ur.fecha_fin > NOW())
  );
$$;

CREATE POLICY "revision_select" ON public.hoja_de_vida_revision FOR SELECT
  USING (
    id_hoja_de_vida IN (
      SELECT id_hoja_de_vida FROM public.hoja_de_vida
      WHERE id_usuario = public._current_app_user_id()
    )
    OR id_revisor = public._current_app_user_id()
    OR public._is_manager()
  );

CREATE POLICY "revision_insert" ON public.hoja_de_vida_revision FOR INSERT
  WITH CHECK (public._is_manager());

CREATE POLICY "revision_update" ON public.hoja_de_vida_revision FOR UPDATE
  USING (id_revisor = public._current_app_user_id() OR public._is_manager());

CREATE POLICY "etiqueta_select" ON public.hoja_de_vida_etiqueta FOR SELECT
  USING (activa = true);

CREATE POLICY "etiqueta_usuario_select" ON public.hoja_de_vida_etiqueta_usuario FOR SELECT
  USING (
    id_hoja_de_vida IN (
      SELECT id_hoja_de_vida FROM public.hoja_de_vida
      WHERE id_usuario = public._current_app_user_id()
    )
    OR public._is_manager()
  );

CREATE POLICY "etiqueta_usuario_insert" ON public.hoja_de_vida_etiqueta_usuario FOR INSERT
  WITH CHECK (public._is_manager());

CREATE POLICY "etiqueta_usuario_delete" ON public.hoja_de_vida_etiqueta_usuario FOR DELETE
  USING (public._is_manager());

CREATE POLICY "disponibilidad_select" ON public.hoja_de_vida_disponibilidad FOR SELECT
  USING (
    id_hoja_de_vida IN (
      SELECT id_hoja_de_vida FROM public.hoja_de_vida
      WHERE id_usuario = public._current_app_user_id()
    )
    OR public._is_manager()
  );

CREATE POLICY "disponibilidad_all" ON public.hoja_de_vida_disponibilidad FOR ALL
  USING (
    id_hoja_de_vida IN (
      SELECT id_hoja_de_vida FROM public.hoja_de_vida
      WHERE id_usuario = public._current_app_user_id()
    )
    OR public._is_manager()
  );

-- Step 3: Seed initial etiquetas
INSERT INTO public.hoja_de_vida_etiqueta (nombre, categoria) VALUES
  ('Alabanza',       'musica'),
  ('Adoración',      'musica'),
  ('Predicación',    'ensenanza'),
  ('Enseñanza',      'ensenanza'),
  ('Discipulado',    'ensenanza'),
  ('Consejería',     'consejeria'),
  ('Administración', 'administracion'),
  ('Evangelismo',    'ministerio'),
  ('Intercesión',    'ministerio'),
  ('Diaconado',      'ministerio'),
  ('Infantil',       'ministerio'),
  ('Juventud',       'ministerio'),
  ('Sonido',         'tecnologia'),
  ('Video',          'tecnologia'),
  ('Diseño',         'tecnologia')
ON CONFLICT (nombre) DO NOTHING;
