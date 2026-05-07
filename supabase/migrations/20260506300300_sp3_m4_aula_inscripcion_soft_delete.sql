-- supabase/migrations/20260506300300_sp3_m4_aula_inscripcion_soft_delete.sql
-- Soft delete en aula_inscripcion (ya se agrega en M1, esta es idempotente)
-- + Índices FK faltantes para performance en RLS

ALTER TABLE public.aula_inscripcion
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Índices FK críticos para performance
CREATE INDEX IF NOT EXISTS idx_iglesia_pastor_id_iglesia ON public.iglesia_pastor(id_iglesia);
CREATE INDEX IF NOT EXISTS idx_iglesia_pastor_id_pastor ON public.iglesia_pastor(id_pastor);
CREATE INDEX IF NOT EXISTS idx_sede_pastor_id_sede ON public.sede_pastor(id_sede);
CREATE INDEX IF NOT EXISTS idx_sede_pastor_id_pastor ON public.sede_pastor(id_pastor);
CREATE INDEX IF NOT EXISTS idx_miembro_ministerio_id_usuario ON public.miembro_ministerio(id_usuario);
CREATE INDEX IF NOT EXISTS idx_usuario_rol_id_iglesia ON public.usuario_rol(id_iglesia);
CREATE INDEX IF NOT EXISTS idx_usuario_rol_id_usuario ON public.usuario_rol(id_usuario);
CREATE INDEX IF NOT EXISTS idx_aula_curso_id_usuario_creador ON public.aula_curso(id_usuario_creador);
CREATE INDEX IF NOT EXISTS idx_aula_inscripcion_id_usuario ON public.aula_inscripcion(id_usuario);
CREATE INDEX IF NOT EXISTS idx_aula_inscripcion_id_aula_curso ON public.aula_inscripcion(id_aula_curso);
CREATE INDEX IF NOT EXISTS idx_notificacion_id_usuario ON public.notificacion(id_usuario);
CREATE INDEX IF NOT EXISTS idx_tarea_asignada_id_usuario ON public.tarea_asignada(id_usuario);
CREATE INDEX IF NOT EXISTS idx_tarea_id_usuario_creador ON public.tarea(id_usuario_creador);
