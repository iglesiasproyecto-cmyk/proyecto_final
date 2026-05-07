-- supabase/migrations/20260506300000_sp3_m1_aula_curso_iglesia.sql
-- Permite cursos a nivel de iglesia (para todos los miembros) además de ministerio

-- Agregar columna id_iglesia nullable
ALTER TABLE public.aula_curso
  ADD COLUMN IF NOT EXISTS id_iglesia bigint REFERENCES public.iglesia(id_iglesia) ON DELETE RESTRICT;

-- Hacer id_ministerio nullable (los cursos de iglesia no tienen ministerio)
ALTER TABLE public.aula_curso
  ALTER COLUMN id_ministerio DROP NOT NULL;

-- Constraint: exactamente uno de id_ministerio o id_iglesia debe estar presente
ALTER TABLE public.aula_curso
  DROP CONSTRAINT IF EXISTS aula_curso_scope_check;

ALTER TABLE public.aula_curso
  ADD CONSTRAINT aula_curso_scope_check
  CHECK (
    (id_ministerio IS NOT NULL AND id_iglesia IS NULL)
    OR
    (id_ministerio IS NULL AND id_iglesia IS NOT NULL)
  );

-- Índice para búsquedas por iglesia
CREATE INDEX IF NOT EXISTS idx_aula_curso_iglesia
  ON public.aula_curso(id_iglesia) WHERE id_iglesia IS NOT NULL;

-- Índice para búsquedas por ministerio (ya existía, verificar)
CREATE INDEX IF NOT EXISTS idx_aula_curso_ministerio
  ON public.aula_curso(id_ministerio) WHERE id_ministerio IS NOT NULL;
