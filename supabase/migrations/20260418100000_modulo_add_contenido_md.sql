-- Añade columna para contenido enriquecido (Markdown) en cada módulo.
-- No reemplaza `descripcion`: se mantiene para resumen corto.

ALTER TABLE public.modulo
  ADD COLUMN IF NOT EXISTS contenido_md TEXT NULL;

COMMENT ON COLUMN public.modulo.contenido_md IS
  'Contenido de aprendizaje del modulo en formato Markdown (GFM). NULL si aun no se ha editado.';
