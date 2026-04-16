-- Migration: Add foreign key indexes
-- Date: 2026-03-31
-- Purpose: Add indexes on FK columns for better query performance

CREATE INDEX IF NOT EXISTS idx_sede_id_iglesia ON public.sede(id_iglesia);
CREATE INDEX IF NOT EXISTS idx_ministerio_id_sede ON public.ministerio(id_sede);
CREATE INDEX IF NOT EXISTS idx_evento_id_iglesia ON public.evento(id_iglesia);
CREATE INDEX IF NOT EXISTS idx_tarea_id_evento ON public.tarea(id_evento);
CREATE INDEX IF NOT EXISTS idx_notificacion_id_usuario ON public.notificacion(id_usuario);
CREATE INDEX IF NOT EXISTS idx_tarea_asignada_id_usuario ON public.tarea_asignada(id_usuario);
CREATE INDEX IF NOT EXISTS idx_evaluacion_id_usuario ON public.evaluacion(id_usuario);
CREATE INDEX IF NOT EXISTS idx_usuario_rol_id_usuario ON public.usuario_rol(id_usuario);
