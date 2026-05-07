-- supabase/migrations/20260506300200_sp3_m3_pastor_iglesia.sql
-- Agrega id_iglesia a pastor con backfill y trigger de sincronización

ALTER TABLE public.pastor
  ADD COLUMN IF NOT EXISTS id_iglesia bigint REFERENCES public.iglesia(id_iglesia) ON DELETE SET NULL;

-- Backfill: iglesia principal activa
UPDATE public.pastor p
SET id_iglesia = (
  SELECT ip.id_iglesia
  FROM public.iglesia_pastor ip
  WHERE ip.id_pastor = p.id_pastor
    AND ip.es_principal = true
    AND ip.fecha_fin IS NULL
  ORDER BY ip.fecha_inicio DESC
  LIMIT 1
)
WHERE p.id_iglesia IS NULL;

-- Si no tiene principal, usar cualquier asignación activa
UPDATE public.pastor p
SET id_iglesia = (
  SELECT ip.id_iglesia
  FROM public.iglesia_pastor ip
  WHERE ip.id_pastor = p.id_pastor
    AND ip.fecha_fin IS NULL
  ORDER BY ip.fecha_inicio DESC
  LIMIT 1
)
WHERE p.id_iglesia IS NULL;

CREATE INDEX IF NOT EXISTS idx_pastor_iglesia
  ON public.pastor(id_iglesia) WHERE id_iglesia IS NOT NULL;

-- Trigger para mantener id_iglesia sincronizado con iglesia_pastor
CREATE OR REPLACE FUNCTION public.sync_pastor_iglesia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_pastor bigint;
  v_new_iglesia bigint;
BEGIN
  -- Determine which pastor to update
  v_id_pastor := COALESCE(NEW.id_pastor, OLD.id_pastor);

  -- Re-derive the best current iglesia for this pastor
  SELECT ip.id_iglesia INTO v_new_iglesia
  FROM public.iglesia_pastor ip
  WHERE ip.id_pastor = v_id_pastor
    AND ip.fecha_fin IS NULL
  ORDER BY ip.es_principal DESC, ip.fecha_inicio DESC
  LIMIT 1;

  -- Update pastor.id_iglesia (sets NULL if no active assignment remains)
  UPDATE public.pastor
  SET id_iglesia = v_new_iglesia
  WHERE id_pastor = v_id_pastor;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_pastor_iglesia_trigger ON public.iglesia_pastor;
CREATE TRIGGER sync_pastor_iglesia_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.iglesia_pastor
  FOR EACH ROW EXECUTE FUNCTION public.sync_pastor_iglesia();
