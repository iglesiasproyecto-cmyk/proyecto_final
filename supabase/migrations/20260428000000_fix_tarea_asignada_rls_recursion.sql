-- Fix infinite recursion in tarea_asignada RLS policy.
-- Root cause: tarea SELECT policy reads tarea_asignada (to check assignment),
-- and tarea_asignada SELECT policy reads tarea (to check ministerio for líder),
-- creating a circular dependency.
-- Solution: a SECURITY DEFINER helper that reads tarea.id_ministerio bypassing RLS,
-- so tarea_asignada policies never trigger tarea RLS.

CREATE OR REPLACE FUNCTION public.get_tarea_ministerio(p_id_tarea bigint)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id_ministerio FROM public.tarea WHERE id_tarea = p_id_tarea;
$$;

GRANT EXECUTE ON FUNCTION public.get_tarea_ministerio(bigint) TO authenticated;

-- Re-create tarea_asignada policies using the helper to avoid recursion

DROP POLICY IF EXISTS "TareaAsignada select por rol" ON public.tarea_asignada;
DROP POLICY IF EXISTS "TareaAsignada insert por gestion" ON public.tarea_asignada;
DROP POLICY IF EXISTS "TareaAsignada update por rol" ON public.tarea_asignada;
DROP POLICY IF EXISTS "TareaAsignada delete por gestion" ON public.tarea_asignada;

CREATE POLICY "TareaAsignada select por rol" ON public.tarea_asignada
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR tarea_asignada.id_usuario = public.current_usuario_id()
    OR (
      public.is_admin_iglesia()
      AND EXISTS (
        SELECT 1
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = public.get_tarea_ministerio(tarea_asignada.id_tarea)
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
    )
    OR (
      public.is_lider()
      AND public.get_tarea_ministerio(tarea_asignada.id_tarea) IN (
        SELECT id_ministerio FROM public.get_user_ministerios()
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
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = public.get_tarea_ministerio(tarea_asignada.id_tarea)
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
    )
    OR (
      public.is_lider()
      AND public.get_tarea_ministerio(tarea_asignada.id_tarea) IN (
        SELECT id_ministerio FROM public.get_user_ministerios()
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
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = public.get_tarea_ministerio(tarea_asignada.id_tarea)
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
    )
    OR (
      public.is_lider()
      AND public.get_tarea_ministerio(tarea_asignada.id_tarea) IN (
        SELECT id_ministerio FROM public.get_user_ministerios()
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
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = public.get_tarea_ministerio(tarea_asignada.id_tarea)
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
    )
    OR (
      public.is_lider()
      AND public.get_tarea_ministerio(tarea_asignada.id_tarea) IN (
        SELECT id_ministerio FROM public.get_user_ministerios()
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
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = public.get_tarea_ministerio(tarea_asignada.id_tarea)
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
    )
    OR (
      public.is_lider()
      AND public.get_tarea_ministerio(tarea_asignada.id_tarea) IN (
        SELECT id_ministerio FROM public.get_user_ministerios()
      )
    )
  );
