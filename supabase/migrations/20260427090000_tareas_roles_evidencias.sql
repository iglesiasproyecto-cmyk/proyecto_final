-- ============================================================================
-- Scope tareas/eventos por rol + evidencias en storage
-- ============================================================================

-- 1) Nuevo estado para revision
DO $$ BEGIN
  ALTER TYPE public.estado_tarea ADD VALUE IF NOT EXISTS 'en_revision';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Asociar tareas a ministerio
ALTER TABLE public.tarea
  ADD COLUMN IF NOT EXISTS id_ministerio bigint;

DO $$ BEGIN
  ALTER TABLE public.tarea
    ADD CONSTRAINT tarea_id_ministerio_fkey
    FOREIGN KEY (id_ministerio) REFERENCES public.ministerio(id_ministerio)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_tarea_id_ministerio ON public.tarea(id_ministerio);

-- Backfill desde evento
UPDATE public.tarea t
SET id_ministerio = e.id_ministerio
FROM public.evento e
WHERE t.id_evento = e.id_evento
  AND t.id_ministerio IS NULL
  AND e.id_ministerio IS NOT NULL;

-- Backfill desde creador (lider)
UPDATE public.tarea t
SET id_ministerio = (
  SELECT mm.id_ministerio
  FROM public.miembro_ministerio mm
  WHERE mm.id_usuario = t.id_usuario_creador
    AND mm.fecha_salida IS NULL
    AND mm.rol_ministerio = 'Líder'
  LIMIT 1
)
WHERE t.id_ministerio IS NULL;

-- 3) Evidencias de tareas
CREATE TABLE IF NOT EXISTS public.tarea_evidencia (
  id_tarea_evidencia bigserial PRIMARY KEY,
  id_tarea_asignada bigint NOT NULL REFERENCES public.tarea_asignada(id_tarea_asignada) ON DELETE CASCADE,
  id_usuario bigint NOT NULL REFERENCES public.usuario(id_usuario) ON DELETE CASCADE,
  object_path text NOT NULL,
  nombre_archivo text NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tarea_evidencia_tarea_asignada ON public.tarea_evidencia(id_tarea_asignada);
CREATE INDEX IF NOT EXISTS idx_tarea_evidencia_object_path ON public.tarea_evidencia(object_path);

ALTER TABLE public.tarea_evidencia ENABLE ROW LEVEL SECURITY;

-- 4) Endurecer RLS tareas
DROP POLICY IF EXISTS "Lectura autenticada" ON public.tarea;
DROP POLICY IF EXISTS "Authenticated select tarea" ON public.tarea;
DROP POLICY IF EXISTS "Authenticated insert tarea" ON public.tarea;
DROP POLICY IF EXISTS "Authenticated update tarea" ON public.tarea;
DROP POLICY IF EXISTS "Authenticated delete tarea" ON public.tarea;

CREATE POLICY "Tarea select por rol" ON public.tarea
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND EXISTS (
        SELECT 1
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = tarea.id_ministerio
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
    )
    OR (
      public.is_lider()
      AND tarea.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
    )
    OR EXISTS (
      SELECT 1
      FROM public.tarea_asignada ta
      WHERE ta.id_tarea = tarea.id_tarea
        AND ta.id_usuario = public.current_usuario_id()
    )
  );

CREATE POLICY "Tarea insert por lider" ON public.tarea
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_super_admin() OR public.is_admin_iglesia() OR public.is_lider())
    AND tarea.id_usuario_creador = public.current_usuario_id()
    AND tarea.id_ministerio IS NOT NULL
    AND (
      public.is_super_admin()
      OR (
        public.is_admin_iglesia()
        AND EXISTS (
          SELECT 1
          FROM public.ministerio m
          JOIN public.sede s ON s.id_sede = m.id_sede
          WHERE m.id_ministerio = tarea.id_ministerio
            AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
        )
      )
      OR tarea.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
    )
  );

CREATE POLICY "Tarea update por gestion" ON public.tarea
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND EXISTS (
        SELECT 1
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = tarea.id_ministerio
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
    )
    OR (
      public.is_lider()
      AND tarea.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND EXISTS (
        SELECT 1
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = tarea.id_ministerio
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
    )
    OR (
      public.is_lider()
      AND tarea.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
    )
  );

CREATE POLICY "Tarea delete por gestion" ON public.tarea
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND EXISTS (
        SELECT 1
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = tarea.id_ministerio
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
    )
    OR (
      public.is_lider()
      AND tarea.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
    )
  );

-- 5) Endurecer RLS eventos
DROP POLICY IF EXISTS "Lectura autenticada" ON public.evento;
DROP POLICY IF EXISTS "Authenticated insert evento" ON public.evento;
DROP POLICY IF EXISTS "Authenticated update evento" ON public.evento;
DROP POLICY IF EXISTS "Authenticated delete evento" ON public.evento;

CREATE POLICY "Evento select por alcance" ON public.evento
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND evento.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
    )
    OR evento.id_ministerio IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.miembro_ministerio mm
      WHERE mm.id_usuario = public.current_usuario_id()
        AND mm.id_ministerio = evento.id_ministerio
        AND mm.fecha_salida IS NULL
    )
  );

CREATE POLICY "Evento insert por gestion" ON public.evento
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND evento.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
    )
    OR (
      public.is_lider()
      AND evento.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
    )
  );

CREATE POLICY "Evento update por gestion" ON public.evento
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND evento.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
    )
    OR (
      public.is_lider()
      AND evento.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND evento.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
    )
    OR (
      public.is_lider()
      AND evento.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
    )
  );

CREATE POLICY "Evento delete por gestion" ON public.evento
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND evento.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
    )
    OR (
      public.is_lider()
      AND evento.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
    )
  );

-- 6) Endurecer RLS tarea_asignada
DROP POLICY IF EXISTS "Usuario ve sus tareas asignadas" ON public.tarea_asignada;
DROP POLICY IF EXISTS "Authenticated insert tarea_asignada" ON public.tarea_asignada;
DROP POLICY IF EXISTS "Authenticated update tarea_asignada" ON public.tarea_asignada;
DROP POLICY IF EXISTS "Authenticated delete tarea_asignada" ON public.tarea_asignada;

CREATE POLICY "TareaAsignada select por rol" ON public.tarea_asignada
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND EXISTS (
        SELECT 1
        FROM public.tarea t
        JOIN public.ministerio m ON m.id_ministerio = t.id_ministerio
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE t.id_tarea = tarea_asignada.id_tarea
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
    )
    OR tarea_asignada.id_usuario = public.current_usuario_id()
    OR (
      public.is_lider()
      AND EXISTS (
        SELECT 1
        FROM public.tarea t
        WHERE t.id_tarea = tarea_asignada.id_tarea
          AND t.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
      )
    )
  );

CREATE POLICY "TareaAsignada insert por gestion" ON public.tarea_asignada
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND EXISTS (
        SELECT 1
        FROM public.tarea t
        JOIN public.ministerio m ON m.id_ministerio = t.id_ministerio
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE t.id_tarea = tarea_asignada.id_tarea
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
    )
    OR (
      public.is_lider()
      AND EXISTS (
        SELECT 1
        FROM public.tarea t
        WHERE t.id_tarea = tarea_asignada.id_tarea
          AND t.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
      )
      AND EXISTS (
        SELECT 1
        FROM public.miembro_ministerio mm
        WHERE mm.id_usuario = tarea_asignada.id_usuario
          AND mm.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
          AND mm.fecha_salida IS NULL
      )
    )
  );

CREATE POLICY "TareaAsignada update por rol" ON public.tarea_asignada
  FOR UPDATE TO authenticated
  USING (
    tarea_asignada.id_usuario = public.current_usuario_id()
    OR public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND EXISTS (
        SELECT 1
        FROM public.tarea t
        JOIN public.ministerio m ON m.id_ministerio = t.id_ministerio
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE t.id_tarea = tarea_asignada.id_tarea
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
    )
    OR (
      public.is_lider()
      AND EXISTS (
        SELECT 1
        FROM public.tarea t
        WHERE t.id_tarea = tarea_asignada.id_tarea
          AND t.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
      )
    )
  )
  WITH CHECK (
    tarea_asignada.id_usuario = public.current_usuario_id()
    OR public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND EXISTS (
        SELECT 1
        FROM public.tarea t
        JOIN public.ministerio m ON m.id_ministerio = t.id_ministerio
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE t.id_tarea = tarea_asignada.id_tarea
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
    )
    OR (
      public.is_lider()
      AND EXISTS (
        SELECT 1
        FROM public.tarea t
        WHERE t.id_tarea = tarea_asignada.id_tarea
          AND t.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
      )
    )
  );

CREATE POLICY "TareaAsignada delete por gestion" ON public.tarea_asignada
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND EXISTS (
        SELECT 1
        FROM public.tarea t
        JOIN public.ministerio m ON m.id_ministerio = t.id_ministerio
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE t.id_tarea = tarea_asignada.id_tarea
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
    )
    OR (
      public.is_lider()
      AND EXISTS (
        SELECT 1
        FROM public.tarea t
        WHERE t.id_tarea = tarea_asignada.id_tarea
          AND t.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
      )
    )
  );

-- 7) RLS tarea_evidencia
DROP POLICY IF EXISTS "TareaEvidencia select" ON public.tarea_evidencia;
DROP POLICY IF EXISTS "TareaEvidencia insert" ON public.tarea_evidencia;
DROP POLICY IF EXISTS "TareaEvidencia delete" ON public.tarea_evidencia;

CREATE POLICY "TareaEvidencia select" ON public.tarea_evidencia
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND EXISTS (
        SELECT 1
        FROM public.tarea_asignada ta
        JOIN public.tarea t ON t.id_tarea = ta.id_tarea
        JOIN public.ministerio m ON m.id_ministerio = t.id_ministerio
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE ta.id_tarea_asignada = tarea_evidencia.id_tarea_asignada
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
    )
    OR tarea_evidencia.id_usuario = public.current_usuario_id()
    OR (
      public.is_lider()
      AND EXISTS (
        SELECT 1
        FROM public.tarea_asignada ta
        JOIN public.tarea t ON t.id_tarea = ta.id_tarea
        WHERE ta.id_tarea_asignada = tarea_evidencia.id_tarea_asignada
          AND t.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
      )
    )
  );

CREATE POLICY "TareaEvidencia insert" ON public.tarea_evidencia
  FOR INSERT TO authenticated
  WITH CHECK (
    tarea_evidencia.id_usuario = public.current_usuario_id()
    AND EXISTS (
      SELECT 1
      FROM public.tarea_asignada ta
      WHERE ta.id_tarea_asignada = tarea_evidencia.id_tarea_asignada
        AND ta.id_usuario = public.current_usuario_id()
    )
  );

CREATE POLICY "TareaEvidencia delete" ON public.tarea_evidencia
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND EXISTS (
        SELECT 1
        FROM public.tarea_asignada ta
        JOIN public.tarea t ON t.id_tarea = ta.id_tarea
        JOIN public.ministerio m ON m.id_ministerio = t.id_ministerio
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE ta.id_tarea_asignada = tarea_evidencia.id_tarea_asignada
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
    )
    OR tarea_evidencia.id_usuario = public.current_usuario_id()
    OR (
      public.is_lider()
      AND EXISTS (
        SELECT 1
        FROM public.tarea_asignada ta
        JOIN public.tarea t ON t.id_tarea = ta.id_tarea
        WHERE ta.id_tarea_asignada = tarea_evidencia.id_tarea_asignada
          AND t.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
      )
    )
  );

-- 8) RPC tareas con reglas por rol
CREATE OR REPLACE FUNCTION public.create_tarea(
  p_titulo text,
  p_descripcion text DEFAULT NULL,
  p_fecha_limite date DEFAULT NULL,
  p_prioridad text DEFAULT 'media',
  p_id_usuario_creador integer DEFAULT NULL,
  p_id_ministerio bigint DEFAULT NULL,
  p_id_evento bigint DEFAULT NULL
)
RETURNS public.tarea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.tarea;
  v_usuario_id integer;
  v_ministerio_id bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;

  IF NOT (public.is_lider() OR public.is_admin_iglesia() OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Forbidden: role not allowed to create tasks';
  END IF;

  v_usuario_id := public.current_usuario_id();

  IF p_id_usuario_creador IS NOT NULL AND p_id_usuario_creador <> v_usuario_id THEN
    RAISE EXCEPTION 'Forbidden: cannot spoof creator';
  END IF;

  IF p_id_ministerio IS NOT NULL THEN
    v_ministerio_id := p_id_ministerio;
  ELSE
    IF public.is_lider() THEN
      SELECT id_ministerio INTO v_ministerio_id
      FROM public.get_user_ministerios()
      LIMIT 1;
    ELSE
      RAISE EXCEPTION 'Ministerio requerido para crear tarea';
    END IF;
  END IF;

  IF v_ministerio_id IS NULL THEN
    RAISE EXCEPTION 'Ministerio requerido para crear tarea';
  END IF;

  IF public.is_lider() AND v_ministerio_id NOT IN (SELECT id_ministerio FROM public.get_user_ministerios()) THEN
    RAISE EXCEPTION 'Forbidden: ministry out of scope';
  END IF;

  IF public.is_admin_iglesia() THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.ministerio m
      JOIN public.sede s ON s.id_sede = m.id_sede
      WHERE m.id_ministerio = v_ministerio_id
        AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
    ) THEN
      RAISE EXCEPTION 'Forbidden: ministry out of scope';
    END IF;
  END IF;

  INSERT INTO public.tarea (
    titulo,
    descripcion,
    fecha_limite,
    estado,
    prioridad,
    id_usuario_creador,
    id_ministerio,
    id_evento
  ) VALUES (
    p_titulo,
    p_descripcion,
    p_fecha_limite,
    'pendiente',
    p_prioridad::public.prioridad_tarea,
    v_usuario_id,
    v_ministerio_id,
    p_id_evento
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_tarea(text, text, date, text, integer, bigint, bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_tarea_estado_rpc(
  p_id_tarea integer,
  p_estado text
)
RETURNS public.tarea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.tarea;
  v_actual public.estado_tarea;
  v_ministerio_id bigint;
  v_is_assigned boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;

  SELECT estado, id_ministerio
  INTO v_actual, v_ministerio_id
  FROM public.tarea
  WHERE id_tarea = p_id_tarea;

  IF v_actual IS NULL THEN
    RAISE EXCEPTION 'Tarea not found';
  END IF;

  IF public.is_admin_iglesia() THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.ministerio m
      JOIN public.sede s ON s.id_sede = m.id_sede
      WHERE m.id_ministerio = v_ministerio_id
        AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
    ) THEN
      RAISE EXCEPTION 'Forbidden: task out of scope';
    END IF;
  END IF;

  v_is_assigned := EXISTS (
    SELECT 1
    FROM public.tarea_asignada ta
    WHERE ta.id_tarea = p_id_tarea
      AND ta.id_usuario = public.current_usuario_id()
  );

  IF public.is_super_admin() OR public.is_admin_iglesia() THEN
    -- admins: allow any change
  ELSIF public.is_lider() THEN
    IF v_ministerio_id NOT IN (SELECT id_ministerio FROM public.get_user_ministerios()) THEN
      RAISE EXCEPTION 'Forbidden: task out of scope';
    END IF;

    IF NOT (
      (v_actual = 'en_revision' AND p_estado IN ('completada', 'en_progreso'))
      OR p_estado = 'cancelada'
    ) THEN
      RAISE EXCEPTION 'Invalid state transition for leader';
    END IF;
  ELSIF v_is_assigned THEN
    IF NOT (
      (v_actual = 'pendiente' AND p_estado = 'en_progreso')
      OR (v_actual = 'en_progreso' AND p_estado = 'en_revision')
    ) THEN
      RAISE EXCEPTION 'Invalid state transition for assignee';
    END IF;
  ELSE
    RAISE EXCEPTION 'Forbidden: not allowed to update task status';
  END IF;

  UPDATE public.tarea
  SET estado = p_estado::public.estado_tarea
  WHERE id_tarea = p_id_tarea
  RETURNING * INTO v_result;

  IF v_is_assigned AND v_actual = 'en_progreso' AND p_estado = 'en_revision' THEN
    UPDATE public.tarea_asignada
    SET fecha_completado = now()
    WHERE id_tarea = p_id_tarea
      AND id_usuario = public.current_usuario_id();
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_tarea_estado_rpc(integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_tarea_rpc(
  p_id_tarea integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ministerio_id bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;

  SELECT id_ministerio INTO v_ministerio_id
  FROM public.tarea
  WHERE id_tarea = p_id_tarea;

  IF v_ministerio_id IS NULL THEN
    RAISE EXCEPTION 'Tarea not found';
  END IF;

  IF NOT (public.is_super_admin() OR public.is_admin_iglesia()) THEN
    IF NOT (public.is_lider() AND v_ministerio_id IN (SELECT id_ministerio FROM public.get_user_ministerios())) THEN
      RAISE EXCEPTION 'Forbidden: not allowed to delete task';
    END IF;
  ELSE
    IF public.is_admin_iglesia() THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = v_ministerio_id
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      ) THEN
        RAISE EXCEPTION 'Forbidden: task out of scope';
      END IF;
    END IF;
  END IF;

  DELETE FROM public.tarea WHERE id_tarea = p_id_tarea;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_tarea_rpc(integer) TO authenticated;

-- 9) Storage bucket y policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tarea-evidencias',
  'tarea-evidencias',
  false,
  26214400,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'application/zip',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Tarea evidencias read" ON storage.objects;
DROP POLICY IF EXISTS "Tarea evidencias insert" ON storage.objects;
DROP POLICY IF EXISTS "Tarea evidencias update" ON storage.objects;
DROP POLICY IF EXISTS "Tarea evidencias delete" ON storage.objects;

CREATE POLICY "Tarea evidencias read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tarea-evidencias'
  AND EXISTS (
    SELECT 1
    FROM public.tarea_evidencia te
    JOIN public.tarea_asignada ta ON ta.id_tarea_asignada = te.id_tarea_asignada
    JOIN public.tarea t ON t.id_tarea = ta.id_tarea
    WHERE te.object_path = storage.objects.name
      AND (
        te.id_usuario = public.current_usuario_id()
        OR public.is_super_admin()
        OR (
          public.is_admin_iglesia()
          AND EXISTS (
            SELECT 1
            FROM public.ministerio m
            JOIN public.sede s ON s.id_sede = m.id_sede
            WHERE m.id_ministerio = t.id_ministerio
              AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
          )
        )
        OR (
          public.is_lider()
          AND t.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
        )
      )
  )
);

CREATE POLICY "Tarea evidencias insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tarea-evidencias'
  AND EXISTS (
    SELECT 1
    FROM public.tarea_evidencia te
    WHERE te.object_path = storage.objects.name
      AND te.id_usuario = public.current_usuario_id()
  )
);

CREATE POLICY "Tarea evidencias update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tarea-evidencias'
  AND EXISTS (
    SELECT 1
    FROM public.tarea_evidencia te
    WHERE te.object_path = storage.objects.name
      AND te.id_usuario = public.current_usuario_id()
  )
)
WITH CHECK (
  bucket_id = 'tarea-evidencias'
  AND EXISTS (
    SELECT 1
    FROM public.tarea_evidencia te
    WHERE te.object_path = storage.objects.name
      AND te.id_usuario = public.current_usuario_id()
  )
);

CREATE POLICY "Tarea evidencias delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'tarea-evidencias'
  AND EXISTS (
    SELECT 1
    FROM public.tarea_evidencia te
    JOIN public.tarea_asignada ta ON ta.id_tarea_asignada = te.id_tarea_asignada
    JOIN public.tarea t ON t.id_tarea = ta.id_tarea
    WHERE te.object_path = storage.objects.name
      AND (
        te.id_usuario = public.current_usuario_id()
        OR public.is_super_admin()
        OR (
          public.is_admin_iglesia()
          AND EXISTS (
            SELECT 1
            FROM public.ministerio m
            JOIN public.sede s ON s.id_sede = m.id_sede
            WHERE m.id_ministerio = t.id_ministerio
              AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
          )
        )
        OR (
          public.is_lider()
          AND t.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
        )
      )
  )
);
