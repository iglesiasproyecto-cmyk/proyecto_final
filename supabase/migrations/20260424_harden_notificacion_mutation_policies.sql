-- Hardening notificacion mutation policies
-- Remove permissive legacy policies and scope UPDATE to owner only.

DROP POLICY IF EXISTS "Authenticated insert notificacion" ON public.notificacion;
DROP POLICY IF EXISTS "Authenticated delete notificacion" ON public.notificacion;
DROP POLICY IF EXISTS "Authenticated update notificacion" ON public.notificacion;
DROP POLICY IF EXISTS "Usuario puede actualizar su notificacion" ON public.notificacion;

CREATE POLICY "Usuario puede actualizar su notificacion"
  ON public.notificacion
  FOR UPDATE
  TO authenticated
  USING (id_usuario = public.current_usuario_id())
  WITH CHECK (id_usuario = public.current_usuario_id());
