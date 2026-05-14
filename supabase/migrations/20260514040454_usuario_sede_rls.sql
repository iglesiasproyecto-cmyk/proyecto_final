-- ============================================================
-- Migration: usuario_sede table + RLS
-- Sede-first membership model: a user joins a sede before any ministerio.
-- ============================================================

-- Helper trigger function for updated_at (used by usuario_sede)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── Table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.usuario_sede (
  id            bigserial PRIMARY KEY,
  id_usuario    bigint NOT NULL REFERENCES public.usuario(id_usuario) ON DELETE CASCADE,
  id_sede       bigint NOT NULL REFERENCES public.sede(id_sede)       ON DELETE CASCADE,
  fecha_ingreso date   NOT NULL DEFAULT CURRENT_DATE,
  estado        text   NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  creado_en     timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_usuario, id_sede)
);

CREATE TRIGGER set_usuario_sede_updated_at
  BEFORE UPDATE ON public.usuario_sede
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── RLS ───────────────────────────────────────────────────
ALTER TABLE public.usuario_sede ENABLE ROW LEVEL SECURITY;

-- super_admin: full access
CREATE POLICY "super_admin_usuario_sede_all"
  ON public.usuario_sede FOR ALL TO authenticated
  USING    (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- admin_iglesia: all rows within their iglesia
CREATE POLICY "admin_iglesia_usuario_sede_select"
  ON public.usuario_sede FOR SELECT TO authenticated
  USING (
    public.is_admin_iglesia() AND
    id_sede IN (SELECT id_sede FROM public.sede WHERE id_iglesia = public.get_my_tenant_id())
  );

CREATE POLICY "admin_iglesia_usuario_sede_insert"
  ON public.usuario_sede FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_iglesia() AND
    id_sede IN (SELECT id_sede FROM public.sede WHERE id_iglesia = public.get_my_tenant_id())
  );

CREATE POLICY "admin_iglesia_usuario_sede_update"
  ON public.usuario_sede FOR UPDATE TO authenticated
  USING (
    public.is_admin_iglesia() AND
    id_sede IN (SELECT id_sede FROM public.sede WHERE id_iglesia = public.get_my_tenant_id())
  )
  WITH CHECK (
    public.is_admin_iglesia() AND
    id_sede IN (SELECT id_sede FROM public.sede WHERE id_iglesia = public.get_my_tenant_id())
  );

CREATE POLICY "admin_iglesia_usuario_sede_delete"
  ON public.usuario_sede FOR DELETE TO authenticated
  USING (
    public.is_admin_iglesia() AND
    id_sede IN (SELECT id_sede FROM public.sede WHERE id_iglesia = public.get_my_tenant_id())
  );

-- admin_sede: rows within their sedes only
CREATE POLICY "admin_sede_usuario_sede_select"
  ON public.usuario_sede FOR SELECT TO authenticated
  USING (
    public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
    id_sede IN (SELECT id FROM public.get_my_sedes())
  );

CREATE POLICY "admin_sede_usuario_sede_insert"
  ON public.usuario_sede FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
    id_sede IN (SELECT id FROM public.get_my_sedes())
  );

CREATE POLICY "admin_sede_usuario_sede_update"
  ON public.usuario_sede FOR UPDATE TO authenticated
  USING (
    public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
    id_sede IN (SELECT id FROM public.get_my_sedes())
  )
  WITH CHECK (
    public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
    id_sede IN (SELECT id FROM public.get_my_sedes())
  );

CREATE POLICY "admin_sede_usuario_sede_delete"
  ON public.usuario_sede FOR DELETE TO authenticated
  USING (
    public.is_admin_sede() AND NOT public.is_admin_iglesia() AND
    id_sede IN (SELECT id FROM public.get_my_sedes())
  );

-- lider/servidor: can see members in their sedes (via ministerio membership)
CREATE POLICY "member_usuario_sede_select"
  ON public.usuario_sede FOR SELECT TO authenticated
  USING (
    id_sede IN (
      SELECT m.id_sede
      FROM public.ministerio m
      JOIN public.miembro_ministerio mm ON mm.id_ministerio = m.id_ministerio
      WHERE mm.id_usuario = public.get_my_usuario_id()
        AND mm.fecha_salida IS NULL
    )
  );

-- Grant API access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuario_sede TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.usuario_sede_id_seq TO authenticated;
