-- ==============================================================================
-- PRODUCTION FIX: Eventos y Tareas - Consistency Audit
-- Date: 2026-05-09
-- Purpose: Arreglar inconsistencias encontradas en la auditoría del módulo de 
--          eventos y tareas para dejar listo para producción.
-- ==============================================================================

-- ==============================================================================
-- 1. AGREGAR COLUMNA tipo_evento_texto A evento
-- Problema: El frontend usa tipo_evento_texto pero la columna no existe en la DB
-- ==============================================================================

ALTER TABLE public.evento
  ADD COLUMN IF NOT EXISTS tipo_evento_texto VARCHAR(200);

COMMENT ON COLUMN public.evento.tipo_evento_texto IS 'Tipo de evento en texto libre (alternativo a id_tipo_evento)';

-- ==============================================================================
-- 2. HACER id_tipo_evento OPCIONAL EN evento
-- Problema: El schema original requiere id_tipo_evento pero el frontend usa texto libre
-- ==============================================================================

ALTER TABLE public.evento
  ALTER COLUMN id_tipo_evento DROP NOT NULL;

-- ==============================================================================
-- 3. VERIFICAR Y AGREGAR ESTADO en_revision A estado_tarea
-- Problema: El estado en_revision fue agregado en una migración pero puede faltar
-- ==============================================================================

DO $$ BEGIN
  ALTER TYPE public.estado_tarea ADD VALUE IF NOT EXISTS 'en_revision';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==============================================================================
-- 4. VERIFICAR COLUMNA id_ministerio EN tarea
-- Problema: Agregada en migración 20260427090000 pero verificar que existe
-- ==============================================================================

ALTER TABLE public.tarea
  ADD COLUMN IF NOT EXISTS id_ministerio BIGINT REFERENCES public.ministerio(id_ministerio) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tarea_id_ministerio ON public.tarea(id_ministerio);

-- ==============================================================================
-- 5. VERIFICAR COLUMNA id_iglesia EN tarea
-- Problema: Agregada en migración 20260506300100 pero verificar que existe
-- ==============================================================================

ALTER TABLE public.tarea
  ADD COLUMN IF NOT EXISTS id_iglesia BIGINT REFERENCES public.iglesia(id_iglesia) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tarea_id_iglesia ON public.tarea(id_iglesia) WHERE id_iglesia IS NOT NULL;

-- ==============================================================================
-- 6. ACTUALIZAR RPC create_tarea PARA MANEJAR id_iglesia
-- Problema: La RPC actual no deriva id_iglesia desde el ministerio
-- ==============================================================================

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
  v_iglesia_id bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;

  IF NOT (public.is_lider() OR public.is_admin_iglesia() OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Forbidden: role not allowed to create tasks';
  END IF;

  v_usuario_id := COALESCE(p_id_usuario_creador, public.get_my_usuario_id());

  IF p_id_usuario_creador IS NOT NULL AND p_id_usuario_creador <> v_usuario_id THEN
    RAISE EXCEPTION 'Forbidden: cannot spoof creator';
  END IF;

  -- Derivar id_ministerio si no se provee
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

  -- Verificar scope del ministerio para líderes
  IF public.is_lider() AND v_ministerio_id NOT IN (SELECT id FROM public.get_user_ministerios()) THEN
    RAISE EXCEPTION 'Forbidden: ministry out of scope';
  END IF;

  -- Verificar scope del ministerio para admins
  IF public.is_admin_iglesia() THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.ministerio m
      JOIN public.sede s ON s.id_sede = m.id_sede
      WHERE m.id_ministerio = v_ministerio_id
        AND s.id_iglesia = public.get_my_tenant_id()
    ) THEN
      RAISE EXCEPTION 'Forbidden: ministry out of scope';
    END IF;
  END IF;

  -- Derivar id_iglesia desde el ministerio
  SELECT s.id_iglesia INTO v_iglesia_id
  FROM public.ministerio m
  JOIN public.sede s ON s.id_sede = m.id_sede
  WHERE m.id_ministerio = v_ministerio_id;

  -- Insertar la tarea con id_iglesia derivado
  INSERT INTO public.tarea (
    titulo,
    descripcion,
    fecha_limite,
    estado,
    prioridad,
    id_usuario_creador,
    id_ministerio,
    id_iglesia,
    id_evento
  ) VALUES (
    p_titulo,
    p_descripcion,
    p_fecha_limite,
    'pendiente',
    p_prioridad::public.prioridad_tarea,
    v_usuario_id,
    v_ministerio_id,
    v_iglesia_id,
    p_id_evento
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_tarea(text, text, date, text, integer, bigint, bigint) TO authenticated;

-- ==============================================================================
-- 7. ASEGURAR QUE is_lider() EXISTA Y ESTÉ CORRECTAMENTE DEFINIDA
-- Problema: La función puede tener referencias obsoletas a rol_ministerio
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_lider()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.usuario_rol ur
    JOIN public.rol r ON ur.id_rol = r.id_rol
    WHERE ur.id_usuario = public.get_my_usuario_id()
      AND r.nombre = 'Líder'
      AND ur.fecha_fin IS NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_lider() TO authenticated;

-- ==============================================================================
-- 8. ASEGURAR get_user_ministerios() USE EL NOMBRE DE COLUMNA CORRECTO
-- Problema: La función puede usar rol_ministerio que fue renombrado a rol_en_ministerio
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_user_ministerios()
RETURNS TABLE(id_ministerio bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT mm.id_ministerio
  FROM public.miembro_ministerio mm
  WHERE mm.id_usuario = public.get_my_usuario_id()
    AND mm.fecha_salida IS NULL
    AND mm.rol_en_ministerio = 'Líder';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_ministerios() TO authenticated;

-- ==============================================================================
-- 9. CREAR get_user_iglesias() SI NO EXISTE
-- Problema: Necesaria para políticas RLS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_user_iglesias()
RETURNS TABLE(id_iglesia bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ur.id_iglesia
  FROM public.usuario_rol ur
  WHERE ur.id_usuario = public.get_my_usuario_id()
    AND ur.fecha_fin IS NULL
    AND ur.id_iglesia IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_iglesias() TO authenticated;

-- ==============================================================================
-- 10. CREAR current_usuario_id() SI NO EXISTE
-- Problema: Usada en políticas RLS de tarea_asignada
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.current_usuario_id()
RETURNS bigint
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.get_my_usuario_id();
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_usuario_id() TO authenticated;

-- ==============================================================================
-- 11. VERIFICAR POLÍTICAS RLS DE evento
-- Problema: Asegurar que existan políticas correctas
-- ==============================================================================

ALTER TABLE public.evento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Evento select por alcance" ON public.evento;
DROP POLICY IF EXISTS "Evento insert por gestion" ON public.evento;
DROP POLICY IF EXISTS "Evento update por gestion" ON public.evento;
DROP POLICY IF EXISTS "Evento delete por gestion" ON public.evento;

CREATE POLICY "Evento select por alcance" ON public.evento
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND evento.id_iglesia = public.get_my_tenant_id()
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
      AND evento.id_iglesia = public.get_my_tenant_id()
    )
    OR (
      public.is_lider()
      AND evento.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
    )
  );

CREATE POLICY "Evento update por gestion" ON public.evento
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND evento.id_iglesia = public.get_my_tenant_id()
    )
    OR (
      public.is_lider()
      AND evento.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND evento.id_iglesia = public.get_my_tenant_id()
    )
    OR (
      public.is_lider()
      AND evento.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
    )
  );

CREATE POLICY "Evento delete por gestion" ON public.evento
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND evento.id_iglesia = public.get_my_tenant_id()
    )
    OR (
      public.is_lider()
      AND evento.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
    )
  );

-- ==============================================================================
-- 12. VERIFICAR POLÍTICAS RLS DE tarea
-- Problema: Asegurar que existan políticas correctas y usar id_iglesia
-- ==============================================================================

ALTER TABLE public.tarea ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tarea select por rol" ON public.tarea;
DROP POLICY IF EXISTS "Tarea insert por lider" ON public.tarea;
DROP POLICY IF EXISTS "Tarea update por gestion" ON public.tarea;
DROP POLICY IF EXISTS "Tarea delete por gestion" ON public.tarea;

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
          AND s.id_iglesia = public.get_my_tenant_id()
      )
    )
    OR (
      public.is_lider()
      AND tarea.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
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
            AND s.id_iglesia = public.get_my_tenant_id()
        )
      )
      OR tarea.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
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
          AND s.id_iglesia = public.get_my_tenant_id()
      )
    )
    OR (
      public.is_lider()
      AND tarea.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
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
          AND s.id_iglesia = public.get_my_tenant_id()
      )
    )
    OR (
      public.is_lider()
      AND tarea.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
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
          AND s.id_iglesia = public.get_my_tenant_id()
      )
    )
    OR (
      public.is_lider()
      AND tarea.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
    )
  );

-- ==============================================================================
-- 13. VERIFICAR POLÍTICAS RLS DE tarea_asignada
-- ==============================================================================

ALTER TABLE public.tarea_asignada ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "TareaAsignada select por rol" ON public.tarea_asignada;
DROP POLICY IF EXISTS "TareaAsignada insert por gestion" ON public.tarea_asignada;
DROP POLICY IF EXISTS "TareaAsignada update por rol" ON public.tarea_asignada;
DROP POLICY IF EXISTS "TareaAsignada delete por gestion" ON public.tarea_asignada;

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
          AND s.id_iglesia = public.get_my_tenant_id()
      )
    )
    OR tarea_asignada.id_usuario = public.current_usuario_id()
    OR (
      public.is_lider()
      AND EXISTS (
        SELECT 1
        FROM public.tarea t
        WHERE t.id_tarea = tarea_asignada.id_tarea
          AND t.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
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
          AND s.id_iglesia = public.get_my_tenant_id()
      )
    )
    OR (
      public.is_lider()
      AND EXISTS (
        SELECT 1
        FROM public.tarea t
        WHERE t.id_tarea = tarea_asignada.id_tarea
          AND t.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
      )
      AND EXISTS (
        SELECT 1
        FROM public.miembro_ministerio mm
        WHERE mm.id_usuario = tarea_asignada.id_usuario
          AND mm.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
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
          AND s.id_iglesia = public.get_my_tenant_id()
      )
    )
    OR (
      public.is_lider()
      AND EXISTS (
        SELECT 1
        FROM public.tarea t
        WHERE t.id_tarea = tarea_asignada.id_tarea
          AND t.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
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
          AND s.id_iglesia = public.get_my_tenant_id()
      )
    )
    OR (
      public.is_lider()
      AND EXISTS (
        SELECT 1
        FROM public.tarea t
        WHERE t.id_tarea = tarea_asignada.id_tarea
          AND t.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
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
          AND s.id_iglesia = public.get_my_tenant_id()
      )
    )
    OR (
      public.is_lider()
      AND EXISTS (
        SELECT 1
        FROM public.tarea t
        WHERE t.id_tarea = tarea_asignada.id_tarea
          AND t.id_ministerio IN (SELECT id FROM public.get_user_ministerios())
      )
    )
  );

-- ==============================================================================
-- 14. CREAR UNIQUE CONSTRAINT EN tarea_asignada (id_tarea, id_usuario)
-- Problema: Necesario para evitar duplicados en asignaciones
-- ==============================================================================

ALTER TABLE public.tarea_asignada
  ADD CONSTRAINT tarea_asignada_id_tarea_id_usuario_key UNIQUE (id_tarea, id_usuario);

-- ==============================================================================
-- 15. ASEGURAR QUE tipo_evento TENGA RLS
-- ==============================================================================

ALTER TABLE public.tipo_evento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tipo evento select" ON public.tipo_evento;

CREATE POLICY "Tipo evento select" ON public.tipo_evento
  FOR SELECT TO authenticated
  USING (true);

-- ==============================================================================
-- 16. VERIFICAR Y CREAR EL TRIGGER DE SYNC iglesia SI NO EXISTE
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sync_tarea_iglesia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id_iglesia IS NULL AND NEW.id_ministerio IS NOT NULL THEN
    SELECT s.id_iglesia INTO NEW.id_iglesia
    FROM public.ministerio m
    JOIN public.sede s ON s.id_sede = m.id_sede
    WHERE m.id_ministerio = NEW.id_ministerio
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_tarea_iglesia_trigger ON public.tarea;
CREATE TRIGGER sync_tarea_iglesia_trigger
  BEFORE INSERT OR UPDATE ON public.tarea
  FOR EACH ROW EXECUTE FUNCTION public.sync_tarea_iglesia();

GRANT EXECUTE ON FUNCTION public.sync_tarea_iglesia() TO authenticated;

-- ==============================================================================
-- 17. BACKFILL: Actualizar id_iglesia para tareas existentes sin él
-- ==============================================================================

UPDATE public.tarea t
SET id_iglesia = (
  SELECT s.id_iglesia
  FROM public.ministerio m
  JOIN public.sede s ON s.id_sede = m.id_sede
  WHERE m.id_ministerio = t.id_ministerio
  LIMIT 1
)
WHERE t.id_iglesia IS NULL
  AND t.id_ministerio IS NOT NULL;

UPDATE public.tarea t
SET id_iglesia = e.id_iglesia
FROM public.evento e
WHERE t.id_evento = e.id_evento
  AND t.id_iglesia IS NULL;

-- ==============================================================================
-- RESUMEN DE CAMBIOS:
-- ==============================================================================
-- 1. Agregada columna tipo_evento_texto a evento
-- 2. Hecho id_tipo_evento opcional en evento
-- 3. Verificado estado_tarea enum tiene en_revision
-- 4. Verificada columna id_ministerio en tarea
-- 5. Verificada columna id_iglesia en tarea
-- 6. Actualizada RPC create_tarea para derivar id_iglesia
-- 7. Corregida función is_lider()
-- 8. Corregida función get_user_ministerios() (rol_en_ministerio)
-- 9. Creada función get_user_iglesias()
-- 10. Creada función current_usuario_id()
-- 11. Recreadas políticas RLS de evento usando get_my_tenant_id()
-- 12. Recreadas políticas RLS de tarea usando id_iglesia
-- 13. Recreadas políticas RLS de tarea_asignada
-- 14. Agregada constraint unique en tarea_asignada
-- 15. Asegurado RLS en tipo_evento
-- 16. Recreado trigger sync_tarea_iglesia
-- 17. Backfill de id_iglesia en tareas existentes
-- ==============================================================================