CREATE OR REPLACE FUNCTION public.hdv_can_view_usuario(p_target_usuario bigint)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me bigint;
BEGIN
  v_me := public._current_app_user_id();

  IF v_me IS NULL OR p_target_usuario IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_me = p_target_usuario THEN
    RETURN TRUE;
  END IF;

  IF public.is_super_admin() THEN
    RETURN TRUE;
  END IF;

  IF public.is_admin_iglesia() THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.usuario_rol me
      JOIN public.usuario_rol tu ON tu.id_iglesia = me.id_iglesia
      WHERE me.id_usuario = v_me
        AND tu.id_usuario = p_target_usuario
        AND me.fecha_fin IS NULL
        AND tu.fecha_fin IS NULL
        AND me.id_iglesia IS NOT NULL
    );
  END IF;

  IF public.is_admin_sede() THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.usuario_rol_sede me
      JOIN public.usuario_rol_sede tu ON tu.id_sede = me.id_sede
      WHERE me.id_usuario = v_me
        AND tu.id_usuario = p_target_usuario
        AND me.fecha_fin IS NULL
        AND tu.fecha_fin IS NULL
    );
  END IF;

  IF public.is_lider() THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.ministerio m
      JOIN public.miembro_ministerio tmm ON tmm.id_ministerio = m.id_ministerio
      WHERE m.id_usuario_creador = v_me
        AND tmm.id_usuario = p_target_usuario
        AND (tmm.activo IS NULL OR tmm.activo = TRUE)
    );
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.hdv_can_review_usuario(p_target_usuario bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_target_usuario IS NOT NULL
    AND p_target_usuario <> public._current_app_user_id()
    AND (
      public.is_super_admin()
      OR public.is_admin_iglesia()
      OR public.is_admin_sede()
      OR public.is_lider()
    )
    AND public.hdv_can_view_usuario(p_target_usuario);
$$;

ALTER TABLE public.hoja_de_vida ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoja_de_vida_revision ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoja_de_vida_etiqueta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoja_de_vida_etiqueta_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoja_de_vida_disponibilidad ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hdv_self_select ON public.hoja_de_vida;
DROP POLICY IF EXISTS hdv_scoped_select ON public.hoja_de_vida;
DROP POLICY IF EXISTS hdv_self_update ON public.hoja_de_vida;
DROP POLICY IF EXISTS hdv_self_insert ON public.hoja_de_vida;
DROP POLICY IF EXISTS "Usuarios ven su propia hoja de vida" ON public.hoja_de_vida;
DROP POLICY IF EXISTS "Admins ven hojas de vida de su iglesia" ON public.hoja_de_vida;
DROP POLICY IF EXISTS "Líderes ven hojas de vida de su ministerio" ON public.hoja_de_vida;
DROP POLICY IF EXISTS "Usuarios actualizan su propia hoja de vida" ON public.hoja_de_vida;
DROP POLICY IF EXISTS "Usuarios crean su propia hoja de vida" ON public.hoja_de_vida;

CREATE POLICY hdv_self_select ON public.hoja_de_vida
FOR SELECT TO authenticated
USING (id_usuario = public._current_app_user_id());

CREATE POLICY hdv_scoped_select ON public.hoja_de_vida
FOR SELECT TO authenticated
USING (public.hdv_can_view_usuario(id_usuario));

CREATE POLICY hdv_self_insert ON public.hoja_de_vida
FOR INSERT TO authenticated
WITH CHECK (id_usuario = public._current_app_user_id());

CREATE POLICY hdv_self_update ON public.hoja_de_vida
FOR UPDATE TO authenticated
USING (id_usuario = public._current_app_user_id())
WITH CHECK (id_usuario = public._current_app_user_id());

DROP POLICY IF EXISTS hdv_revision_select ON public.hoja_de_vida_revision;
DROP POLICY IF EXISTS hdv_revision_insert_scoped ON public.hoja_de_vida_revision;
DROP POLICY IF EXISTS hdv_revision_update_scoped ON public.hoja_de_vida_revision;

CREATE POLICY hdv_revision_select ON public.hoja_de_vida_revision
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.hoja_de_vida h
    WHERE h.id_hoja_de_vida = hoja_de_vida_revision.id_hoja_de_vida
      AND public.hdv_can_view_usuario(h.id_usuario)
  )
);

CREATE POLICY hdv_revision_insert_scoped ON public.hoja_de_vida_revision
FOR INSERT TO authenticated
WITH CHECK (
  id_revisor = public._current_app_user_id()
  AND EXISTS (
    SELECT 1
    FROM public.hoja_de_vida h
    WHERE h.id_hoja_de_vida = hoja_de_vida_revision.id_hoja_de_vida
      AND public.hdv_can_review_usuario(h.id_usuario)
  )
);

CREATE POLICY hdv_revision_update_scoped ON public.hoja_de_vida_revision
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.hoja_de_vida h
    WHERE h.id_hoja_de_vida = hoja_de_vida_revision.id_hoja_de_vida
      AND public.hdv_can_review_usuario(h.id_usuario)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.hoja_de_vida h
    WHERE h.id_hoja_de_vida = hoja_de_vida_revision.id_hoja_de_vida
      AND public.hdv_can_review_usuario(h.id_usuario)
  )
);

DROP POLICY IF EXISTS hdv_etiqueta_select ON public.hoja_de_vida_etiqueta;
DROP POLICY IF EXISTS hdv_etiqueta_mutation_admin ON public.hoja_de_vida_etiqueta;

CREATE POLICY hdv_etiqueta_select ON public.hoja_de_vida_etiqueta
FOR SELECT TO authenticated
USING (TRUE);

CREATE POLICY hdv_etiqueta_mutation_admin ON public.hoja_de_vida_etiqueta
FOR ALL TO authenticated
USING (public.is_super_admin() OR public.is_admin_iglesia() OR public.is_admin_sede())
WITH CHECK (public.is_super_admin() OR public.is_admin_iglesia() OR public.is_admin_sede());

DROP POLICY IF EXISTS hdv_etiqueta_usuario_select ON public.hoja_de_vida_etiqueta_usuario;
DROP POLICY IF EXISTS hdv_etiqueta_usuario_insert_scoped ON public.hoja_de_vida_etiqueta_usuario;
DROP POLICY IF EXISTS hdv_etiqueta_usuario_delete_scoped ON public.hoja_de_vida_etiqueta_usuario;

CREATE POLICY hdv_etiqueta_usuario_select ON public.hoja_de_vida_etiqueta_usuario
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hoja_de_vida h
    WHERE h.id_hoja_de_vida = hoja_de_vida_etiqueta_usuario.id_hoja_de_vida
      AND public.hdv_can_view_usuario(h.id_usuario)
  )
);

CREATE POLICY hdv_etiqueta_usuario_insert_scoped ON public.hoja_de_vida_etiqueta_usuario
FOR INSERT TO authenticated
WITH CHECK (
  asignada_por = public._current_app_user_id()
  AND EXISTS (
    SELECT 1 FROM public.hoja_de_vida h
    WHERE h.id_hoja_de_vida = hoja_de_vida_etiqueta_usuario.id_hoja_de_vida
      AND public.hdv_can_review_usuario(h.id_usuario)
  )
);

CREATE POLICY hdv_etiqueta_usuario_delete_scoped ON public.hoja_de_vida_etiqueta_usuario
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hoja_de_vida h
    WHERE h.id_hoja_de_vida = hoja_de_vida_etiqueta_usuario.id_hoja_de_vida
      AND public.hdv_can_review_usuario(h.id_usuario)
  )
);

DROP POLICY IF EXISTS hdv_disponibilidad_select ON public.hoja_de_vida_disponibilidad;
DROP POLICY IF EXISTS hdv_disponibilidad_insert ON public.hoja_de_vida_disponibilidad;
DROP POLICY IF EXISTS hdv_disponibilidad_update ON public.hoja_de_vida_disponibilidad;
DROP POLICY IF EXISTS hdv_disponibilidad_delete ON public.hoja_de_vida_disponibilidad;

CREATE POLICY hdv_disponibilidad_select ON public.hoja_de_vida_disponibilidad
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hoja_de_vida h
    WHERE h.id_hoja_de_vida = hoja_de_vida_disponibilidad.id_hoja_de_vida
      AND public.hdv_can_view_usuario(h.id_usuario)
  )
);

CREATE POLICY hdv_disponibilidad_insert ON public.hoja_de_vida_disponibilidad
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.hoja_de_vida h
    WHERE h.id_hoja_de_vida = hoja_de_vida_disponibilidad.id_hoja_de_vida
      AND (
        h.id_usuario = public._current_app_user_id()
        OR public.hdv_can_review_usuario(h.id_usuario)
      )
  )
);

CREATE POLICY hdv_disponibilidad_update ON public.hoja_de_vida_disponibilidad
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hoja_de_vida h
    WHERE h.id_hoja_de_vida = hoja_de_vida_disponibilidad.id_hoja_de_vida
      AND (
        h.id_usuario = public._current_app_user_id()
        OR public.hdv_can_review_usuario(h.id_usuario)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.hoja_de_vida h
    WHERE h.id_hoja_de_vida = hoja_de_vida_disponibilidad.id_hoja_de_vida
      AND (
        h.id_usuario = public._current_app_user_id()
        OR public.hdv_can_review_usuario(h.id_usuario)
      )
  )
);

CREATE POLICY hdv_disponibilidad_delete ON public.hoja_de_vida_disponibilidad
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hoja_de_vida h
    WHERE h.id_hoja_de_vida = hoja_de_vida_disponibilidad.id_hoja_de_vida
      AND (
        h.id_usuario = public._current_app_user_id()
        OR public.hdv_can_review_usuario(h.id_usuario)
      )
  )
);
