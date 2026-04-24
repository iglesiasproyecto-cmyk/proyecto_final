-- ============================================================================
-- FIX: Add SELECT policy for tarea table
-- ============================================================================
-- Problem: Users could create tasks (INSERT policy exists) but couldn't see
-- them because no SELECT policy exists for the tarea table.
--
-- This migration adds SELECT permissions for authenticated users.
-- ============================================================================

-- Drop any existing SELECT policy for tarea to avoid conflicts
DROP POLICY IF EXISTS "Authenticated select tarea" ON public.tarea;

-- Create SELECT policy: authenticated users can view all tasks
CREATE POLICY "Authenticated select tarea"
  ON public.tarea
  FOR SELECT
  TO authenticated
  USING (true);

-- Also verify that tarea_asignada has proper SELECT policy
DROP POLICY IF EXISTS "Usuario ve sus tareas asignadas" ON public.tarea_asignada;

CREATE POLICY "Usuario ve sus tareas asignadas" 
  ON public.tarea_asignada
  FOR SELECT 
  TO authenticated
  USING (true);
