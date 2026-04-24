-- ============================================================================
-- FIX: tarea_asignada SELECT policy too restrictive
-- ============================================================================
-- Problem: The SELECT policy on tarea_asignada was hardened to only show
-- the current user's own assignments. This broke the Kanban view because
-- the JOIN tarea_asignada(*, usuario(...)) in getTareasEnriquecidas()
-- silently filtered out ALL assignments except the current user's,
-- making tasks appear without assignees and confusing the UI.
--
-- Fix: Allow all authenticated users to VIEW assignments (read-only),
-- but keep UPDATE/DELETE restricted to the assigned user or leaders.
-- ============================================================================

-- Drop the overly restrictive SELECT policy
DROP POLICY IF EXISTS "Usuario ve sus tareas asignadas" ON public.tarea_asignada;

-- Create a permissive SELECT policy: all authenticated users can see who is assigned to what
CREATE POLICY "Usuario ve sus tareas asignadas"
  ON public.tarea_asignada
  FOR SELECT
  TO authenticated
  USING (true);

-- Keep UPDATE policy restricted to own assignments or leaders/admins
DROP POLICY IF EXISTS "Usuario puede actualizar su propia tarea_asignada" ON public.tarea_asignada;

CREATE POLICY "Usuario puede actualizar su propia tarea_asignada"
  ON public.tarea_asignada
  FOR UPDATE
  TO authenticated
  USING (
    id_usuario = (
      SELECT id_usuario FROM public.usuario
      WHERE auth_user_id = (select auth.uid())
      LIMIT 1
    )
    OR get_my_highest_role() = ANY (ARRAY['Super Administrador'::text, 'Administrador de Iglesia'::text, 'Líder'::text])
  )
  WITH CHECK (
    id_usuario = (
      SELECT id_usuario FROM public.usuario
      WHERE auth_user_id = (select auth.uid())
      LIMIT 1
    )
    OR get_my_highest_role() = ANY (ARRAY['Super Administrador'::text, 'Administrador de Iglesia'::text, 'Líder'::text])
  );

-- ============================================================================
-- Also verify tarea SELECT policy is open
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated select tarea" ON public.tarea;

CREATE POLICY "Authenticated select tarea"
  ON public.tarea
  FOR SELECT
  TO authenticated
  USING (true);

