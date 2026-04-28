-- Performance hardening: add covering indexes for missing foreign keys

CREATE INDEX IF NOT EXISTS idx_avance_modulo_id_modulo
  ON public.avance_modulo (id_modulo);

CREATE INDEX IF NOT EXISTS idx_respuesta_evaluacion_id_opcion_selected
  ON public.respuesta_evaluacion (id_opcion_selected);

CREATE INDEX IF NOT EXISTS idx_resultado_evaluacion_id_evaluacion_ref
  ON public.resultado_evaluacion (id_evaluacion_ref);
