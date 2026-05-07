-- supabase/migrations/20260506300100_sp3_m2_tarea_iglesia.sql
-- Agrega id_iglesia a tarea para RLS eficiente sin JOIN costoso

ALTER TABLE public.tarea
  ADD COLUMN IF NOT EXISTS id_iglesia bigint REFERENCES public.iglesia(id_iglesia) ON DELETE SET NULL;

-- Backfill desde ministerio → sede → iglesia
UPDATE public.tarea t
SET id_iglesia = (
  SELECT s.id_iglesia
  FROM public.ministerio m
  JOIN public.sede s ON s.id_sede = m.id_sede
  WHERE m.id_ministerio = t.id_ministerio
  LIMIT 1
)
WHERE t.id_ministerio IS NOT NULL
  AND t.id_iglesia IS NULL;

-- Backfill desde evento → iglesia (para tareas sin ministerio)
UPDATE public.tarea t
SET id_iglesia = (
  SELECT e.id_iglesia
  FROM public.evento e
  WHERE e.id_evento = t.id_evento
  LIMIT 1
)
WHERE t.id_evento IS NOT NULL
  AND t.id_iglesia IS NULL;

-- Índice para RLS performance
CREATE INDEX IF NOT EXISTS idx_tarea_iglesia
  ON public.tarea(id_iglesia) WHERE id_iglesia IS NOT NULL;

-- Índice compuesto para listar tareas de un ministerio en una iglesia
CREATE INDEX IF NOT EXISTS idx_tarea_iglesia_ministerio
  ON public.tarea(id_iglesia, id_ministerio);
