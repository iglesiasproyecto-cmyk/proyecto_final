-- ==============================================================================
-- PHASE 1: Tasks & Events Backend Enhancement
-- New tables supporting: evento_ministerio (M2M)
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

CREATE POLICY "EventoMinisterio insert gestion" ON public.evento_ministerio
  FOR INSERT TO authenticated WITH CHECK (
    public.is_super_admin()
    OR public.is_admin_iglesia()
    OR (public.is_lider() AND id_ministerio IN (SELECT id FROM public.get_user_ministerios()))
  );

CREATE POLICY "EventoMinisterio delete gestion" ON public.evento_ministerio
  FOR DELETE TO authenticated USING (
    public.is_super_admin()
    OR public.is_admin_iglesia()
    OR (public.is_lider() AND id_ministerio IN (SELECT id FROM public.get_user_ministerios()))
  );
