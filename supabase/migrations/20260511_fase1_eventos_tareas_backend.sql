-- ==============================================================================
-- PHASE 1: Tasks & Events Backend Enhancement
-- New tables supporting: evento_ministerio (M2M), tarea_historial,
-- tarea_comentario, tarea_checklist, tarea_aprobacion
-- ==============================================================================

-- 1. EVENTO_MINISTERIO (replaces single FK with M2M junction)
CREATE TABLE IF NOT EXISTS public.evento_ministerio (
  id_evento_ministerio BIGSERIAL PRIMARY KEY,
  id_evento BIGINT NOT NULL REFERENCES public.evento(id_evento) ON DELETE CASCADE,
  id_ministerio BIGINT NOT NULL REFERENCES public.ministerio(id_ministerio) ON DELETE CASCADE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_evento, id_ministerio)
);

CREATE INDEX IF NOT EXISTS idx_evento_ministerio_evento ON public.evento_ministerio(id_evento);
CREATE INDEX IF NOT EXISTS idx_evento_ministerio_ministerio ON public.evento_ministerio(id_ministerio);

ALTER TABLE public.evento_ministerio ENABLE ROW LEVEL SECURITY;

-- SELECT policy: same scope as evento
CREATE POLICY "EventoMinisterio select" ON public.evento_ministerio
  FOR SELECT TO authenticated USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.evento e
      WHERE e.id_evento = evento_ministerio.id_evento
        AND (
          public.is_admin_iglesia() AND e.id_iglesia = public.get_my_tenant_id()
          OR EXISTS (
            SELECT 1 FROM public.miembro_ministerio mm
            WHERE mm.id_usuario = public.current_usuario_id()
              AND mm.id_ministerio = evento_ministerio.id_ministerio
              AND mm.fecha_salida IS NULL
          )
        )
    )
  );

-- INSERT policy: admin or lider of that ministry
CREATE POLICY "EventoMinisterio insert gestion" ON public.evento_ministerio
  FOR INSERT TO authenticated WITH CHECK (
    public.is_super_admin()
    OR public.is_admin_iglesia()
    OR (public.is_lider() AND id_ministerio IN (SELECT id FROM public.get_user_ministerios()))
  );

-- DELETE policy: same scope as insert
CREATE POLICY "EventoMinisterio delete gestion" ON public.evento_ministerio
  FOR DELETE TO authenticated USING (
    public.is_super_admin()
    OR public.is_admin_iglesia()
    OR (public.is_lider() AND id_ministerio IN (SELECT id FROM public.get_user_ministerios()))
  );

-- 2. TAREA_HISTORIAL (event-sourcing-light activity log)
CREATE TABLE IF NOT EXISTS public.tarea_historial (
  id_tarea_historial BIGSERIAL PRIMARY KEY,
  id_tarea BIGINT NOT NULL REFERENCES public.tarea(id_tarea) ON DELETE CASCADE,
  id_usuario BIGINT NOT NULL REFERENCES public.usuario(id_usuario),
  accion VARCHAR(50) NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  metadata JSONB,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarea_historial_tarea ON public.tarea_historial(id_tarea, creado_en DESC);

ALTER TABLE public.tarea_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TareaHistorial select" ON public.tarea_historial
  FOR SELECT TO authenticated USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tarea t
      WHERE t.id_tarea = tarea_historial.id_tarea
        AND (
          (public.is_admin_iglesia() AND EXISTS (
            SELECT 1 FROM public.ministerio m
            JOIN public.sede s ON s.id_sede = m.id_sede
            WHERE m.id_ministerio = t.id_ministerio AND s.id_iglesia = public.get_my_tenant_id()
          ))
          OR (public.is_lider() AND t.id_ministerio IN (SELECT id FROM public.get_user_ministerios()))
          OR EXISTS (
            SELECT 1 FROM public.tarea_asignada ta
            WHERE ta.id_tarea = t.id_tarea AND ta.id_usuario = public.current_usuario_id()
          )
        )
    )
  );

-- Auto-trigger: log estado changes on tarea UPDATE
CREATE OR REPLACE FUNCTION public.log_tarea_historial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO public.tarea_historial (id_tarea, id_usuario, accion, valor_anterior, valor_nuevo)
    VALUES (
      NEW.id_tarea,
      COALESCE(public.current_usuario_id(), NEW.id_usuario_creador),
      'cambio_estado',
      OLD.estado::text,
      NEW.estado::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tarea_historial ON public.tarea;
CREATE TRIGGER trg_tarea_historial
  AFTER UPDATE ON public.tarea
  FOR EACH ROW EXECUTE FUNCTION public.log_tarea_historial();

-- 3. TAREA_COMENTARIO
CREATE TABLE IF NOT EXISTS public.tarea_comentario (
  id_tarea_comentario BIGSERIAL PRIMARY KEY,
  id_tarea BIGINT NOT NULL REFERENCES public.tarea(id_tarea) ON DELETE CASCADE,
  id_usuario BIGINT NOT NULL REFERENCES public.usuario(id_usuario),
  contenido TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarea_comentario_tarea ON public.tarea_comentario(id_tarea, creado_en ASC);
ALTER TABLE public.tarea_comentario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TareaComentario select" ON public.tarea_comentario
  FOR SELECT TO authenticated USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tarea t
      WHERE t.id_tarea = tarea_comentario.id_tarea
        AND (
          (public.is_admin_iglesia() AND EXISTS (
            SELECT 1 FROM public.ministerio m JOIN public.sede s ON s.id_sede = m.id_sede
            WHERE m.id_ministerio = t.id_ministerio AND s.id_iglesia = public.get_my_tenant_id()
          ))
          OR (public.is_lider() AND t.id_ministerio IN (SELECT id FROM public.get_user_ministerios()))
          OR EXISTS (
            SELECT 1 FROM public.tarea_asignada ta
            WHERE ta.id_tarea = t.id_tarea AND ta.id_usuario = public.current_usuario_id()
          )
        )
    )
  );

CREATE POLICY "TareaComentario insert" ON public.tarea_comentario
  FOR INSERT TO authenticated WITH CHECK (
    id_usuario = public.current_usuario_id()
    AND EXISTS (
      SELECT 1 FROM public.tarea t LEFT JOIN public.ministerio m ON m.id_ministerio = t.id_ministerio
      WHERE t.id_tarea = tarea_comentario.id_tarea
        AND (
          public.is_super_admin()
          OR (public.is_admin_iglesia() AND EXISTS (
            SELECT 1 FROM public.sede s WHERE s.id_sede = m.id_sede AND s.id_iglesia = public.get_my_tenant_id()
          ))
          OR (public.is_lider() AND t.id_ministerio IN (SELECT id FROM public.get_user_ministerios()))
          OR EXISTS (
            SELECT 1 FROM public.tarea_asignada ta
            WHERE ta.id_tarea = t.id_tarea AND ta.id_usuario = public.current_usuario_id()
          )
        )
    )
  );

CREATE POLICY "TareaComentario delete own" ON public.tarea_comentario
  FOR DELETE TO authenticated USING (id_usuario = public.current_usuario_id());

-- 4. TAREA_CHECKLIST
CREATE TABLE IF NOT EXISTS public.tarea_checklist (
  id_tarea_checklist BIGSERIAL PRIMARY KEY,
  id_tarea BIGINT NOT NULL REFERENCES public.tarea(id_tarea) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  completada BOOLEAN NOT NULL DEFAULT FALSE,
  orden INT NOT NULL DEFAULT 0,
  completada_por BIGINT REFERENCES public.usuario(id_usuario),
  completada_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarea_checklist_tarea ON public.tarea_checklist(id_tarea, orden ASC);
ALTER TABLE public.tarea_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TareaChecklist select" ON public.tarea_checklist
  FOR SELECT TO authenticated USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tarea t
      WHERE t.id_tarea = tarea_checklist.id_tarea
        AND (
          (public.is_admin_iglesia() AND EXISTS (
            SELECT 1 FROM public.ministerio m JOIN public.sede s ON s.id_sede = m.id_sede
            WHERE m.id_ministerio = t.id_ministerio AND s.id_iglesia = public.get_my_tenant_id()
          ))
          OR (public.is_lider() AND t.id_ministerio IN (SELECT id FROM public.get_user_ministerios()))
          OR EXISTS (SELECT 1 FROM public.tarea_asignada ta WHERE ta.id_tarea = t.id_tarea AND ta.id_usuario = public.current_usuario_id())
        )
    )
  );

CREATE POLICY "TareaChecklist insert gestion" ON public.tarea_checklist
  FOR INSERT TO authenticated WITH CHECK (
    public.is_super_admin()
    OR public.is_admin_iglesia()
    OR (public.is_lider() AND id_tarea IN (
      SELECT t.id_tarea FROM public.tarea t WHERE t.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
    ))
  );

CREATE POLICY "TareaChecklist update" ON public.tarea_checklist
  FOR UPDATE TO authenticated USING (
    public.is_super_admin()
    OR public.is_admin_iglesia()
    OR (public.is_lider() AND id_tarea IN (
      SELECT t.id_tarea FROM public.tarea t WHERE t.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
    ))
    OR EXISTS (
      SELECT 1 FROM public.tarea_asignada ta
      WHERE ta.id_tarea = tarea_checklist.id_tarea AND ta.id_usuario = public.current_usuario_id()
    )
  ) WITH CHECK (true);

CREATE POLICY "TareaChecklist delete gestion" ON public.tarea_checklist
  FOR DELETE TO authenticated USING (
    public.is_super_admin()
    OR public.is_admin_iglesia()
  );

-- 5. TAREA_APROBACION
CREATE TABLE IF NOT EXISTS public.tarea_aprobacion (
  id_tarea_aprobacion BIGSERIAL PRIMARY KEY,
  id_tarea BIGINT NOT NULL REFERENCES public.tarea(id_tarea) ON DELETE CASCADE,
  id_usuario BIGINT NOT NULL REFERENCES public.usuario(id_usuario),
  accion VARCHAR(20) NOT NULL CHECK (accion IN ('aprobar', 'rechazar', 'reabrir')),
  observaciones TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarea_aprobacion_tarea ON public.tarea_aprobacion(id_tarea, creado_en DESC);
ALTER TABLE public.tarea_aprobacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TareaAprobacion select" ON public.tarea_aprobacion
  FOR SELECT TO authenticated USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tarea t
      WHERE t.id_tarea = tarea_aprobacion.id_tarea
        AND (
          (public.is_admin_iglesia() AND EXISTS (
            SELECT 1 FROM public.ministerio m JOIN public.sede s ON s.id_sede = m.id_sede
            WHERE m.id_ministerio = t.id_ministerio AND s.id_iglesia = public.get_my_tenant_id()
          ))
          OR (public.is_lider() AND t.id_ministerio IN (SELECT id FROM public.get_user_ministerios()))
          OR EXISTS (SELECT 1 FROM public.tarea_asignada ta WHERE ta.id_tarea = t.id_tarea AND ta.id_usuario = public.current_usuario_id())
        )
    )
  );

CREATE POLICY "TareaAprobacion insert" ON public.tarea_aprobacion
  FOR INSERT TO authenticated WITH CHECK (
    id_usuario = public.current_usuario_id()
    AND (
      public.is_super_admin()
      OR public.is_admin_iglesia()
      OR (public.is_lider() AND id_tarea IN (
        SELECT t.id_tarea FROM public.tarea t WHERE t.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
      ))
    )
  );

-- 6. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_tarea_estado_iglesia ON public.tarea(estado, id_iglesia);
CREATE INDEX IF NOT EXISTS idx_tarea_creado_en ON public.tarea(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_evento_fecha_inicio_iglesia ON public.evento(fecha_inicio DESC, id_iglesia);
