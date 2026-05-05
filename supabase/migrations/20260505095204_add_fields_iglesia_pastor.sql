-- Add new fields to iglesia table
ALTER TABLE public.iglesia ADD COLUMN IF NOT EXISTS direccion character varying;
ALTER TABLE public.iglesia ADD COLUMN IF NOT EXISTS telefono character varying;
ALTER TABLE public.iglesia ADD COLUMN IF NOT EXISTS descripcion text;
ALTER TABLE public.iglesia ADD COLUMN IF NOT EXISTS sitio_web character varying;

-- Add new fields to pastor table
ALTER TABLE public.pastor ADD COLUMN IF NOT EXISTS direccion character varying;
ALTER TABLE public.pastor ADD COLUMN IF NOT EXISTS fecha_nacimiento date;
ALTER TABLE public.pastor ADD COLUMN IF NOT EXISTS biografia text;

-- Add unique constraints for upsert operations
ALTER TABLE public.aula_progreso_actividad ADD CONSTRAINT IF NOT EXISTS aula_progreso_actividad_unique UNIQUE (id_usuario, id_aula_actividad);
ALTER TABLE public.aula_certificado ADD CONSTRAINT IF NOT EXISTS aula_certificado_unique UNIQUE (id_usuario, id_aula_curso);
ALTER TABLE public.tarea_asignada ADD CONSTRAINT IF NOT EXISTS tarea_asignada_unique UNIQUE (id_tarea, id_usuario);