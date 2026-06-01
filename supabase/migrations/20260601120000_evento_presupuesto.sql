-- supabase/migrations/20260601120000_evento_presupuesto.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.evento_presupuesto_item (
  id                bigserial PRIMARY KEY,
  id_evento         bigint NOT NULL REFERENCES public.evento(id_evento) ON DELETE CASCADE,
  tipo              text NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  categoria         text NOT NULL,
  descripcion       text,
  monto_planeado    numeric(12,2) NOT NULL DEFAULT 0,
  monto_real        numeric(12,2),
  created_by        bigint REFERENCES public.usuario(id_usuario) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_epi_evento ON public.evento_presupuesto_item(id_evento);
CREATE INDEX IF NOT EXISTS idx_epi_tipo   ON public.evento_presupuesto_item(tipo);

ALTER TABLE public.evento_presupuesto_item ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at — reutiliza la función genérica que ya existe en el proyecto
DROP TRIGGER IF EXISTS trg_epi_updated_at ON public.evento_presupuesto_item;
CREATE TRIGGER trg_epi_updated_at
  BEFORE UPDATE ON public.evento_presupuesto_item
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- SELECT: todos los roles excepto servidor
CREATE POLICY epi_select ON public.evento_presupuesto_item
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.evento e
      WHERE e.id_evento = evento_presupuesto_item.id_evento
        AND (
          is_super_admin()
          OR (is_admin_iglesia() AND e.id_iglesia = get_my_tenant_id())
          OR (is_admin_sede()    AND e.id_iglesia = get_my_tenant_id())
          OR (is_lider()         AND e.id_iglesia = get_my_tenant_id())
        )
    )
  );

CREATE POLICY epi_insert ON public.evento_presupuesto_item
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.evento e
      WHERE e.id_evento = evento_presupuesto_item.id_evento
        AND (
          is_super_admin()
          OR (is_admin_iglesia() AND e.id_iglesia = get_my_tenant_id())
          OR (is_admin_sede()    AND e.id_iglesia = get_my_tenant_id())
          OR (is_lider()         AND e.id_iglesia = get_my_tenant_id())
        )
    )
  );

CREATE POLICY epi_update ON public.evento_presupuesto_item
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.evento e
      WHERE e.id_evento = evento_presupuesto_item.id_evento
        AND (
          is_super_admin()
          OR (is_admin_iglesia() AND e.id_iglesia = get_my_tenant_id())
          OR (is_admin_sede()    AND e.id_iglesia = get_my_tenant_id())
          OR (is_lider()         AND e.id_iglesia = get_my_tenant_id())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.evento e
      WHERE e.id_evento = evento_presupuesto_item.id_evento
        AND (
          is_super_admin()
          OR (is_admin_iglesia() AND e.id_iglesia = get_my_tenant_id())
          OR (is_admin_sede()    AND e.id_iglesia = get_my_tenant_id())
          OR (is_lider()         AND e.id_iglesia = get_my_tenant_id())
        )
    )
  );

CREATE POLICY epi_delete ON public.evento_presupuesto_item
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.evento e
      WHERE e.id_evento = evento_presupuesto_item.id_evento
        AND (
          is_super_admin()
          OR (is_admin_iglesia() AND e.id_iglesia = get_my_tenant_id())
          OR (is_admin_sede()    AND e.id_iglesia = get_my_tenant_id())
          OR (is_lider()         AND e.id_iglesia = get_my_tenant_id())
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evento_presupuesto_item TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.evento_presupuesto_item_id_seq TO authenticated;

COMMIT;
