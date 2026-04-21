-- ============================================================================
-- Formación production-ready:
--   1. avance_modulo: tabla de progreso + RLS + triggers de auto-transición
--   2. recurso: limpieza automática de archivos en storage al borrar
--   3. notificacion: triggers sobre inscripción / módulo publicado / evaluación
--   4. aula-recursos bucket: file_size_limit + allowed_mime_types
--   5. finalizar_ciclo(): RPC para que admin/líder cierren un ciclo
--   6. v_avance_curso_detalle: vista con progreso por detalle
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) avance_modulo
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.avance_modulo (
  id_avance                bigserial PRIMARY KEY,
  id_usuario               bigint NOT NULL REFERENCES public.usuario(id_usuario) ON DELETE CASCADE,
  id_modulo                bigint NOT NULL REFERENCES public.modulo(id_modulo) ON DELETE CASCADE,
  id_detalle_proceso_curso bigint NOT NULL REFERENCES public.detalle_proceso_curso(id_detalle_proceso_curso) ON DELETE CASCADE,
  completado_en            timestamptz NOT NULL DEFAULT now(),
  creado_en                timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_usuario, id_modulo, id_detalle_proceso_curso)
);

CREATE INDEX IF NOT EXISTS idx_avance_modulo_detalle
  ON public.avance_modulo(id_detalle_proceso_curso);

CREATE INDEX IF NOT EXISTS idx_avance_modulo_usuario_modulo
  ON public.avance_modulo(id_usuario, id_modulo);

ALTER TABLE public.avance_modulo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura avance_modulo" ON public.avance_modulo;
CREATE POLICY "Lectura avance_modulo" ON public.avance_modulo
  FOR SELECT TO authenticated
  USING (
    id_usuario = current_usuario_id()
    OR EXISTS (
      SELECT 1 FROM public.modulo m
      WHERE m.id_modulo = avance_modulo.id_modulo
        AND can_manage_curso_scope(m.id_curso)
    )
  );

DROP POLICY IF EXISTS "Insercion avance_modulo propio" ON public.avance_modulo;
CREATE POLICY "Insercion avance_modulo propio" ON public.avance_modulo
  FOR INSERT TO authenticated
  WITH CHECK (
    id_usuario = current_usuario_id()
    AND EXISTS (
      SELECT 1 FROM public.detalle_proceso_curso d
      WHERE d.id_detalle_proceso_curso = avance_modulo.id_detalle_proceso_curso
        AND d.id_usuario = current_usuario_id()
        AND d.estado IN ('inscrito','en_progreso')
    )
    AND EXISTS (
      SELECT 1 FROM public.modulo m
      WHERE m.id_modulo = avance_modulo.id_modulo
        AND m.estado = 'publicado'
    )
  );

DROP POLICY IF EXISTS "Borrado avance_modulo propio o gestion" ON public.avance_modulo;
CREATE POLICY "Borrado avance_modulo propio o gestion" ON public.avance_modulo
  FOR DELETE TO authenticated
  USING (
    id_usuario = current_usuario_id()
    OR EXISTS (
      SELECT 1 FROM public.modulo m
      WHERE m.id_modulo = avance_modulo.id_modulo
        AND can_manage_curso_scope(m.id_curso)
    )
  );

-- Trigger de auto-transición de estado en detalle_proceso_curso.
CREATE OR REPLACE FUNCTION public.avance_modulo_sync_detalle_ins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id_curso bigint;
  v_total    integer;
  v_done     integer;
BEGIN
  SELECT m.id_curso INTO v_id_curso
    FROM public.modulo m
   WHERE m.id_modulo = NEW.id_modulo;

  SELECT count(*) INTO v_total
    FROM public.modulo
   WHERE id_curso = v_id_curso AND estado = 'publicado';

  SELECT count(DISTINCT a.id_modulo) INTO v_done
    FROM public.avance_modulo a
    JOIN public.modulo m ON m.id_modulo = a.id_modulo
   WHERE a.id_detalle_proceso_curso = NEW.id_detalle_proceso_curso
     AND m.estado = 'publicado';

  IF v_total > 0 AND v_done >= v_total THEN
    UPDATE public.detalle_proceso_curso
       SET estado = 'completado', updated_at = now()
     WHERE id_detalle_proceso_curso = NEW.id_detalle_proceso_curso
       AND estado IN ('inscrito','en_progreso');
  ELSE
    UPDATE public.detalle_proceso_curso
       SET estado = 'en_progreso', updated_at = now()
     WHERE id_detalle_proceso_curso = NEW.id_detalle_proceso_curso
       AND estado = 'inscrito';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_avance_modulo_sync_detalle_ins ON public.avance_modulo;
CREATE TRIGGER trg_avance_modulo_sync_detalle_ins
  AFTER INSERT ON public.avance_modulo
  FOR EACH ROW EXECUTE FUNCTION public.avance_modulo_sync_detalle_ins();

-- Al borrar un avance, reevaluar estado del detalle hacia abajo.
CREATE OR REPLACE FUNCTION public.avance_modulo_sync_detalle_del()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id_curso bigint;
  v_total    integer;
  v_done     integer;
BEGIN
  SELECT m.id_curso INTO v_id_curso
    FROM public.modulo m
   WHERE m.id_modulo = OLD.id_modulo;

  SELECT count(*) INTO v_total
    FROM public.modulo
   WHERE id_curso = v_id_curso AND estado = 'publicado';

  SELECT count(DISTINCT a.id_modulo) INTO v_done
    FROM public.avance_modulo a
    JOIN public.modulo m ON m.id_modulo = a.id_modulo
   WHERE a.id_detalle_proceso_curso = OLD.id_detalle_proceso_curso
     AND m.estado = 'publicado';

  IF v_done = 0 THEN
    UPDATE public.detalle_proceso_curso
       SET estado = 'inscrito', updated_at = now()
     WHERE id_detalle_proceso_curso = OLD.id_detalle_proceso_curso
       AND estado IN ('en_progreso','completado');
  ELSIF v_done < COALESCE(v_total, 0) THEN
    UPDATE public.detalle_proceso_curso
       SET estado = 'en_progreso', updated_at = now()
     WHERE id_detalle_proceso_curso = OLD.id_detalle_proceso_curso
       AND estado = 'completado';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_avance_modulo_sync_detalle_del ON public.avance_modulo;
CREATE TRIGGER trg_avance_modulo_sync_detalle_del
  AFTER DELETE ON public.avance_modulo
  FOR EACH ROW EXECUTE FUNCTION public.avance_modulo_sync_detalle_del();

-- ---------------------------------------------------------------------------
-- 2) Limpieza de archivos huérfanos en storage al borrar recurso.
--    (Cubre DELETE directo y DELETE en cascada desde modulo.)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recurso_cleanup_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.tipo = 'archivo'
     AND OLD.url IS NOT NULL
     AND OLD.url !~ '^https?://'
  THEN
    DELETE FROM storage.objects
     WHERE bucket_id = 'aula-recursos'
       AND name = OLD.url;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_recurso_cleanup_storage ON public.recurso;
CREATE TRIGGER trg_recurso_cleanup_storage
  BEFORE DELETE ON public.recurso
  FOR EACH ROW EXECUTE FUNCTION public.recurso_cleanup_storage();

-- ---------------------------------------------------------------------------
-- 3) Notificaciones automáticas
-- ---------------------------------------------------------------------------

-- Al inscribir un usuario a un ciclo.
CREATE OR REPLACE FUNCTION public.notify_on_inscripcion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_nombre_curso text;
BEGIN
  SELECT c.nombre INTO v_nombre_curso
    FROM public.proceso_asignado_curso p
    JOIN public.curso c ON c.id_curso = p.id_curso
   WHERE p.id_proceso_asignado_curso = NEW.id_proceso_asignado_curso;

  INSERT INTO public.notificacion (id_usuario, titulo, mensaje, tipo)
  VALUES (
    NEW.id_usuario,
    'Te inscribieron a un curso',
    COALESCE('Has sido inscrito a: ' || v_nombre_curso, 'Nueva inscripción'),
    'curso'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_inscripcion ON public.detalle_proceso_curso;
CREATE TRIGGER trg_notify_on_inscripcion
  AFTER INSERT ON public.detalle_proceso_curso
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_inscripcion();

-- Al registrar una evaluación, notificar al usuario evaluado.
CREATE OR REPLACE FUNCTION public.notify_on_evaluacion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_titulo_modulo text;
BEGIN
  SELECT titulo INTO v_titulo_modulo
    FROM public.modulo
   WHERE id_modulo = NEW.id_modulo;

  INSERT INTO public.notificacion (id_usuario, titulo, mensaje, tipo)
  VALUES (
    NEW.id_usuario,
    'Nueva evaluación registrada',
    COALESCE('Se registró tu evaluación del módulo "' || v_titulo_modulo || '".', 'Se registró una evaluación.'),
    'curso'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_evaluacion ON public.evaluacion;
CREATE TRIGGER trg_notify_on_evaluacion
  AFTER INSERT ON public.evaluacion
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_evaluacion();

-- Al publicar un módulo, notificar a los inscritos activos del curso.
CREATE OR REPLACE FUNCTION public.notify_on_modulo_publicado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_should_notify boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_should_notify := NEW.estado = 'publicado';
  ELSIF TG_OP = 'UPDATE' THEN
    v_should_notify := NEW.estado = 'publicado' AND OLD.estado IS DISTINCT FROM 'publicado';
  END IF;

  IF v_should_notify THEN
    INSERT INTO public.notificacion (id_usuario, titulo, mensaje, tipo)
    SELECT DISTINCT d.id_usuario,
                    'Nuevo módulo publicado',
                    'Se publicó el módulo "' || NEW.titulo || '".',
                    'curso'
      FROM public.detalle_proceso_curso d
      JOIN public.proceso_asignado_curso p
        ON p.id_proceso_asignado_curso = d.id_proceso_asignado_curso
     WHERE p.id_curso = NEW.id_curso
       AND d.estado IN ('inscrito','en_progreso');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_modulo_publicado ON public.modulo;
CREATE TRIGGER trg_notify_on_modulo_publicado
  AFTER INSERT OR UPDATE OF estado ON public.modulo
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_modulo_publicado();

-- ---------------------------------------------------------------------------
-- 4) Constraints server-side del bucket (defensa en profundidad)
-- ---------------------------------------------------------------------------

UPDATE storage.buckets
   SET file_size_limit = 26214400, -- 25 MB
       allowed_mime_types = ARRAY[
         'application/pdf',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.ms-excel',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/vnd.ms-powerpoint',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation',
         'text/plain',
         'image/png',
         'image/jpeg',
         'image/webp',
         'application/zip'
       ]
 WHERE id = 'aula-recursos';

-- ---------------------------------------------------------------------------
-- 5) finalizar_ciclo(): RPC con permisos heredados (SECURITY INVOKER → RLS aplica)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.finalizar_ciclo(p_id_proceso bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_id_curso bigint;
BEGIN
  SELECT id_curso INTO v_id_curso
    FROM public.proceso_asignado_curso
   WHERE id_proceso_asignado_curso = p_id_proceso;

  IF v_id_curso IS NULL THEN
    RAISE EXCEPTION 'Ciclo no encontrado';
  END IF;

  -- Cierra el ciclo si aún no ha terminado.
  UPDATE public.proceso_asignado_curso
     SET fecha_fin  = LEAST(COALESCE(fecha_fin, CURRENT_DATE + 1), CURRENT_DATE),
         updated_at = now()
   WHERE id_proceso_asignado_curso = p_id_proceso;

  -- Promueve a "completado" los detalles con 100% de módulos publicados.
  UPDATE public.detalle_proceso_curso d
     SET estado = 'completado', updated_at = now()
   WHERE d.id_proceso_asignado_curso = p_id_proceso
     AND d.estado IN ('inscrito','en_progreso')
     AND EXISTS (
       SELECT 1 FROM public.modulo m
        WHERE m.id_curso = v_id_curso AND m.estado = 'publicado'
     )
     AND (
       SELECT count(DISTINCT a.id_modulo)
         FROM public.avance_modulo a
         JOIN public.modulo m ON m.id_modulo = a.id_modulo
        WHERE a.id_detalle_proceso_curso = d.id_detalle_proceso_curso
          AND m.estado = 'publicado'
     ) = (
       SELECT count(*)
         FROM public.modulo m
        WHERE m.id_curso = v_id_curso AND m.estado = 'publicado'
     );
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalizar_ciclo(bigint) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) Vista de avance por detalle de ciclo
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.v_avance_curso_detalle AS
SELECT
  d.id_detalle_proceso_curso,
  d.id_proceso_asignado_curso,
  d.id_usuario,
  p.id_curso,
  (
    SELECT count(*) FROM public.modulo m
     WHERE m.id_curso = p.id_curso AND m.estado = 'publicado'
  ) AS modulos_publicados,
  (
    SELECT count(DISTINCT a.id_modulo)
      FROM public.avance_modulo a
      JOIN public.modulo m ON m.id_modulo = a.id_modulo
     WHERE a.id_detalle_proceso_curso = d.id_detalle_proceso_curso
       AND m.estado = 'publicado'
  ) AS modulos_completados
FROM public.detalle_proceso_curso d
JOIN public.proceso_asignado_curso p
  ON p.id_proceso_asignado_curso = d.id_proceso_asignado_curso;

ALTER VIEW public.v_avance_curso_detalle SET (security_invoker = true);
GRANT SELECT ON public.v_avance_curso_detalle TO authenticated;
