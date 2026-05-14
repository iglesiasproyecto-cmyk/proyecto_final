-- Add id_iglesia column to aula_curso for church-level courses

ALTER TABLE public.aula_curso
ADD COLUMN IF NOT EXISTS id_iglesia bigint REFERENCES public.iglesia(id_iglesia) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_aula_curso_id_iglesia ON public.aula_curso(id_iglesia);

-- Add constraint to ensure course belongs to either ministerio OR iglesia, but not both
ALTER TABLE public.aula_curso
ADD CONSTRAINT aula_curso_ministerio_iglesia_check
CHECK (
  (id_ministerio IS NOT NULL AND id_iglesia IS NULL) OR
  (id_ministerio IS NULL AND id_iglesia IS NOT NULL)
) NOT VALID;

-- Validate the constraint (this will check existing data)
ALTER TABLE public.aula_curso VALIDATE CONSTRAINT aula_curso_ministerio_iglesia_check;
