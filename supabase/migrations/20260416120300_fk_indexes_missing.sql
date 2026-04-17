-- Hardening performance: índices para FKs reportadas por Supabase advisor.

CREATE INDEX IF NOT EXISTS idx_curso_id_usuario_creador
  ON public.curso (id_usuario_creador);

CREATE INDEX IF NOT EXISTS idx_departamento_id_pais
  ON public.departamento (id_pais);

CREATE INDEX IF NOT EXISTS idx_evento_id_tipo_evento
  ON public.evento (id_tipo_evento);

CREATE INDEX IF NOT EXISTS idx_sede_pastor_id_pastor
  ON public.sede_pastor (id_pastor);

CREATE INDEX IF NOT EXISTS idx_tarea_id_usuario_creador
  ON public.tarea (id_usuario_creador);
