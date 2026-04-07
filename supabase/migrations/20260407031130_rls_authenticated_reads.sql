-- Migration: Add RLS policies for authenticated reads
-- Date: 2026-03-31
-- Purpose: Add read policies for remaining 19 tables

-- Catalog tables: all authenticated users can read
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'iglesia', 'sede', 'pastor', 'ministerio',
    'evento', 'tarea', 'curso', 'modulo', 'recurso',
    'iglesia_pastor', 'sede_pastor',
    'miembro_ministerio', 'proceso_asignado_curso',
    'detalle_proceso_curso'
  ]
  LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY "Lectura autenticada" ON public.%I FOR SELECT TO authenticated USING (true)',
        tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- usuario: each user sees only their own profile
DO $$ BEGIN
  CREATE POLICY "Usuario ve su propio perfil"
  ON public.usuario FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- usuario_rol: user sees their own role assignments
DO $$ BEGIN
  CREATE POLICY "Usuario ve sus roles"
  ON public.usuario_rol FOR SELECT
  TO authenticated
  USING (
    id_usuario = (
      SELECT id_usuario FROM public.usuario
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- notificacion: user sees only their own
DO $$ BEGIN
  CREATE POLICY "Usuario ve sus notificaciones"
  ON public.notificacion FOR SELECT
  TO authenticated
  USING (
    id_usuario = (
      SELECT id_usuario FROM public.usuario
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- tarea_asignada: user sees their own assignments
DO $$ BEGIN
  CREATE POLICY "Usuario ve sus tareas asignadas"
  ON public.tarea_asignada FOR SELECT
  TO authenticated
  USING (
    id_usuario = (
      SELECT id_usuario FROM public.usuario
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- evaluacion: user sees their own evaluations
DO $$ BEGIN
  CREATE POLICY "Usuario ve sus evaluaciones"
  ON public.evaluacion FOR SELECT
  TO authenticated
  USING (
    id_usuario = (
      SELECT id_usuario FROM public.usuario
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
