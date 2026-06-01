BEGIN;

-- 1) Ensure estado_revision exists on tarea (idempotent)
ALTER TABLE public.tarea
  ADD COLUMN IF NOT EXISTS estado_revision text
  DEFAULT 'pendiente'
  CHECK (estado_revision IN ('pendiente', 'en_revision', 'aprobada', 'rechazada'));

-- 2) Remediate accidental tarea_evidencia shape drift
-- Canonical model in this project is bigint-based:
--   public.tarea_evidencia(id_tarea_asignada bigint, id_usuario bigint, ...)
-- This block only ensures canonical indexes/constraints are present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tarea_evidencia'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_tarea_evidencia_tarea_asignada
      ON public.tarea_evidencia(id_tarea_asignada);
    CREATE INDEX IF NOT EXISTS idx_tarea_evidencia_object_path
      ON public.tarea_evidencia(object_path);
  END IF;
END $$;

-- 3) Create/repair tarea_comentario_revision as bigint-based table
DO $$
DECLARE
  v_exists boolean;
  v_uuid_shape boolean;
  v_rowcount bigint;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tarea_comentario_revision'
  ) INTO v_exists;

  IF NOT v_exists THEN
    CREATE TABLE public.tarea_comentario_revision (
      id_tarea_comentario_revision bigserial PRIMARY KEY,
      id_tarea bigint NOT NULL REFERENCES public.tarea(id_tarea) ON DELETE CASCADE,
      id_usuario bigint NOT NULL REFERENCES public.usuario(id_usuario) ON DELETE CASCADE,
      contenido text NOT NULL,
      tipo text NOT NULL DEFAULT 'comentario' CHECK (tipo IN ('comentario', 'aprobacion', 'rechazo')),
      creado_en timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tarea_comentario_revision'
        AND column_name = 'tarea_id'
        AND data_type = 'uuid'
    ) INTO v_uuid_shape;

    IF v_uuid_shape THEN
      EXECUTE 'SELECT count(*) FROM public.tarea_comentario_revision' INTO v_rowcount;
      IF v_rowcount > 0 THEN
        RAISE EXCEPTION 'tarea_comentario_revision has UUID shape with data; manual migration required before applying bigint model';
      END IF;

      DROP TABLE public.tarea_comentario_revision;

      CREATE TABLE public.tarea_comentario_revision (
        id_tarea_comentario_revision bigserial PRIMARY KEY,
        id_tarea bigint NOT NULL REFERENCES public.tarea(id_tarea) ON DELETE CASCADE,
        id_usuario bigint NOT NULL REFERENCES public.usuario(id_usuario) ON DELETE CASCADE,
        contenido text NOT NULL,
        tipo text NOT NULL DEFAULT 'comentario' CHECK (tipo IN ('comentario', 'aprobacion', 'rechazo')),
        creado_en timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tarea_comentario_revision_tarea
  ON public.tarea_comentario_revision(id_tarea);
CREATE INDEX IF NOT EXISTS idx_tarea_comentario_revision_usuario
  ON public.tarea_comentario_revision(id_usuario);

DROP TRIGGER IF EXISTS set_updated_at_tarea_comentario_revision ON public.tarea_comentario_revision;
CREATE TRIGGER set_updated_at_tarea_comentario_revision
  BEFORE UPDATE ON public.tarea_comentario_revision
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- 4) RLS for tarea_comentario_revision
ALTER TABLE public.tarea_comentario_revision ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "TareaComentarioRevision select" ON public.tarea_comentario_revision;
DROP POLICY IF EXISTS "TareaComentarioRevision insert" ON public.tarea_comentario_revision;
DROP POLICY IF EXISTS "TareaComentarioRevision update" ON public.tarea_comentario_revision;
DROP POLICY IF EXISTS "TareaComentarioRevision delete" ON public.tarea_comentario_revision;

CREATE POLICY "TareaComentarioRevision select" ON public.tarea_comentario_revision
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
        WHERE t.id_tarea = tarea_comentario_revision.id_tarea
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
    )
    OR (
      public.is_lider()
      AND EXISTS (
        SELECT 1
        FROM public.tarea t
        WHERE t.id_tarea = tarea_comentario_revision.id_tarea
          AND t.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.tarea_asignada ta
      WHERE ta.id_tarea = tarea_comentario_revision.id_tarea
        AND ta.id_usuario = public.current_usuario_id()
    )
    OR tarea_comentario_revision.id_usuario = public.current_usuario_id()
  );

CREATE POLICY "TareaComentarioRevision insert" ON public.tarea_comentario_revision
  FOR INSERT TO authenticated
  WITH CHECK (
    tarea_comentario_revision.id_usuario = public.current_usuario_id()
    AND (
      public.is_super_admin()
      OR (
        public.is_admin_iglesia()
        AND EXISTS (
          SELECT 1
          FROM public.tarea t
          JOIN public.ministerio m ON m.id_ministerio = t.id_ministerio
          JOIN public.sede s ON s.id_sede = m.id_sede
          WHERE t.id_tarea = tarea_comentario_revision.id_tarea
            AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
        )
      )
      OR (
        public.is_lider()
        AND EXISTS (
          SELECT 1
          FROM public.tarea t
          WHERE t.id_tarea = tarea_comentario_revision.id_tarea
            AND t.id_ministerio IN (SELECT id_ministerio FROM public.get_user_ministerios())
        )
      )
      OR EXISTS (
        SELECT 1
        FROM public.tarea_asignada ta
        WHERE ta.id_tarea = tarea_comentario_revision.id_tarea
          AND ta.id_usuario = public.current_usuario_id()
      )
    )
  );

CREATE POLICY "TareaComentarioRevision update" ON public.tarea_comentario_revision
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR tarea_comentario_revision.id_usuario = public.current_usuario_id()
  )
  WITH CHECK (
    public.is_super_admin()
    OR tarea_comentario_revision.id_usuario = public.current_usuario_id()
  );

CREATE POLICY "TareaComentarioRevision delete" ON public.tarea_comentario_revision
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR tarea_comentario_revision.id_usuario = public.current_usuario_id()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarea_comentario_revision TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.tarea_comentario_revision_id_tarea_comentario_revision_seq TO authenticated;

COMMIT;
