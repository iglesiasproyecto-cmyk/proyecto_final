-- Harden Administrador de Sede scope.
-- Root causes fixed:
-- 1. SECURITY DEFINER RPCs exposed global users/role assignment without caller checks.
-- 2. admin_sede aula policies were iglesia-scoped instead of sede-scoped.
-- 3. stale tarea policies duplicated newer policies and made effective permissions hard to reason about.
--
-- NOTE: Role IDs 3=Líder, 4=Servidor, 9=Administrador de Sede are hardcoded.
-- These come from the rol table seed data and must be kept in sync.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_my_sedes()
RETURNS TABLE(id bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT urs.id_sede::bigint
  FROM public.usuario_rol_sede urs
  JOIN public.rol r ON r.id_rol = urs.id_rol
  WHERE urs.id_usuario = public.get_my_usuario_id()
    AND urs.fecha_fin IS NULL
    AND urs.id_sede IS NOT NULL
    AND lower(translate(r.nombre, 'íÍáÁéÉóÓúÚüÜñÑ', 'iIaAeEoOuUuUnN')) = 'administrador de sede';
$$;

CREATE OR REPLACE FUNCTION public.can_manage_sede(p_id_sede bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND EXISTS (
        SELECT 1
        FROM public.sede s
        WHERE s.id_sede = p_id_sede
          AND s.id_iglesia = public.get_my_tenant_id()
      )
    )
    OR (
      public.is_admin_sede()
      AND NOT public.is_admin_iglesia()
      AND p_id_sede IN (SELECT id FROM public.get_my_sedes())
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_ministerio(p_id_ministerio bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.ministerio m
      JOIN public.sede s ON s.id_sede = m.id_sede
      WHERE m.id_ministerio = p_id_ministerio
        AND (
          (public.is_admin_iglesia() AND s.id_iglesia = public.get_my_tenant_id())
          OR (
            public.is_admin_sede()
            AND NOT public.is_admin_iglesia()
            AND m.id_sede IN (SELECT id FROM public.get_my_sedes())
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_assign_role_scoped(
  p_target_role_id bigint,
  p_id_iglesia bigint,
  p_id_sede bigint DEFAULT NULL,
  p_id_ministerio bigint DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role_name text;
BEGIN
  SELECT nombre INTO v_role_name
  FROM public.rol
  WHERE id_rol = p_target_role_id;

  IF v_role_name IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_super_admin() THEN
    RETURN true;
  END IF;

  IF v_role_name = 'Super Administrador' THEN
    RETURN false;
  END IF;

  IF public.is_admin_iglesia() THEN
    RETURN p_id_iglesia = public.get_my_tenant_id();
  END IF;

  IF public.is_admin_sede() AND NOT public.is_admin_iglesia() THEN
    IF v_role_name NOT IN ('Administrador de Sede', 'Líder', 'Servidor') THEN
      RETURN false;
    END IF;

    IF p_id_sede IS NULL OR p_id_sede NOT IN (SELECT id FROM public.get_my_sedes()) THEN
      RETURN false;
    END IF;

    IF v_role_name IN ('Líder', 'Servidor') THEN
      RETURN p_id_ministerio IS NOT NULL AND public.can_manage_ministerio(p_id_ministerio);
    END IF;

    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_role_with_ministerio(
  p_id_usuario bigint,
  p_id_rol bigint,
  p_id_iglesia bigint,
  p_id_sede bigint DEFAULT NULL,
  p_id_ministerio bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sede_roles bigint[] := ARRAY[3, 4, 9];
  v_min_roles bigint[] := ARRAY[3, 4];
  v_is_sede_role boolean;
  v_needs_min boolean;
  v_id_asignado bigint;
  v_rol_label text;
BEGIN
  IF NOT public.can_assign_role_scoped(p_id_rol, p_id_iglesia, p_id_sede, p_id_ministerio) THEN
    RAISE EXCEPTION 'No autorizado para asignar este rol en el alcance solicitado'
      USING ERRCODE = '42501';
  END IF;

  v_is_sede_role := p_id_rol = ANY(v_sede_roles);
  v_needs_min := p_id_rol = ANY(v_min_roles);

  IF v_is_sede_role THEN
    INSERT INTO public.usuario_rol_sede(id_usuario, id_rol, id_iglesia, id_sede, fecha_inicio)
    SELECT p_id_usuario, p_id_rol, p_id_iglesia, p_id_sede, CURRENT_DATE
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.usuario_rol_sede
      WHERE id_usuario = p_id_usuario
        AND id_rol = p_id_rol
        AND id_iglesia = p_id_iglesia
        AND id_sede IS NOT DISTINCT FROM p_id_sede
        AND fecha_fin IS NULL
    )
    RETURNING id_usuario_rol_sede INTO v_id_asignado;

    IF v_id_asignado IS NULL THEN
      SELECT id_usuario_rol_sede INTO v_id_asignado
      FROM public.usuario_rol_sede
      WHERE id_usuario = p_id_usuario
        AND id_rol = p_id_rol
        AND id_iglesia = p_id_iglesia
        AND id_sede IS NOT DISTINCT FROM p_id_sede
        AND fecha_fin IS NULL
      LIMIT 1;
    END IF;
  ELSE
    INSERT INTO public.usuario_rol(id_usuario, id_rol, id_iglesia, fecha_inicio)
    SELECT p_id_usuario, p_id_rol, p_id_iglesia, CURRENT_DATE
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.usuario_rol
      WHERE id_usuario = p_id_usuario
        AND id_rol = p_id_rol
        AND id_iglesia = p_id_iglesia
        AND fecha_fin IS NULL
    )
    RETURNING id_usuario_rol INTO v_id_asignado;

    IF v_id_asignado IS NULL THEN
      SELECT id_usuario_rol INTO v_id_asignado
      FROM public.usuario_rol
      WHERE id_usuario = p_id_usuario
        AND id_rol = p_id_rol
        AND id_iglesia = p_id_iglesia
        AND fecha_fin IS NULL
      LIMIT 1;
    END IF;
  END IF;

  IF v_needs_min AND p_id_ministerio IS NOT NULL THEN
    v_rol_label := CASE p_id_rol WHEN 3 THEN 'Líder' ELSE 'Servidor' END;
    INSERT INTO public.miembro_ministerio(id_usuario, id_ministerio, rol_en_ministerio, fecha_ingreso)
    VALUES (p_id_usuario, p_id_ministerio, v_rol_label, CURRENT_DATE)
    ON CONFLICT (id_usuario, id_ministerio) WHERE fecha_salida IS NULL DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'id_asignacion', v_id_asignado);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_usuarios_enriquecidos_scoped()
RETURNS TABLE(
  id_usuario bigint,
  nombres text,
  apellidos text,
  correo text,
  telefono text,
  fecha_nacimiento date,
  activo boolean,
  ultimo_acceso timestamptz,
  auth_user_id uuid,
  creado_en timestamptz,
  updated_at timestamptz,
  roles jsonb,
  ministerios jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH visible_users AS (
    SELECT DISTINCT u.id_usuario
    FROM public.usuario u
    WHERE public.is_super_admin()
       OR u.auth_user_id = auth.uid()
       OR (
         public.is_admin_iglesia()
         AND EXISTS (
           SELECT 1 FROM public.usuario_rol ur
           WHERE ur.id_usuario = u.id_usuario
             AND ur.id_iglesia = public.get_my_tenant_id()
             AND ur.fecha_fin IS NULL
         )
       )
       OR (
         public.is_admin_sede()
         AND NOT public.is_admin_iglesia()
         AND (
           EXISTS (
             SELECT 1 FROM public.usuario_rol_sede urs
             WHERE urs.id_usuario = u.id_usuario
               AND urs.id_sede IN (SELECT id FROM public.get_my_sedes())
               AND urs.fecha_fin IS NULL
           )
           OR EXISTS (
             SELECT 1
             FROM public.miembro_ministerio mm
             JOIN public.ministerio m ON m.id_ministerio = mm.id_ministerio
             WHERE mm.id_usuario = u.id_usuario
               AND mm.fecha_salida IS NULL
               AND m.id_sede IN (SELECT id FROM public.get_my_sedes())
           )
         )
       )
  )
  SELECT
    u.id_usuario,
    u.nombres,
    u.apellidos,
    u.correo,
    u.telefono,
    u.fecha_nacimiento,
    u.activo,
    u.ultimo_acceso,
    u.auth_user_id,
    u.creado_en,
    u.updated_at,
    COALESCE((
      SELECT jsonb_agg(role_row ORDER BY role_row->>'rol_nombre')
      FROM (
        SELECT jsonb_build_object(
          'id_usuario_rol', ur.id_usuario_rol,
          'id_rol', ur.id_rol,
          'id_iglesia', ur.id_iglesia,
          'id_sede', NULL,
          'fecha_fin', ur.fecha_fin,
          'rol_nombre', r.nombre,
          'iglesia_nombre', i.nombre,
          'sede_nombre', NULL,
          'source', 'usuario_rol'
        ) AS role_row
        FROM public.usuario_rol ur
        JOIN public.rol r ON r.id_rol = ur.id_rol
        JOIN public.iglesia i ON i.id_iglesia = ur.id_iglesia
        WHERE ur.id_usuario = u.id_usuario
          AND ur.fecha_fin IS NULL

        UNION ALL

        SELECT jsonb_build_object(
          'id_usuario_rol', urs.id_usuario_rol_sede,
          'id_rol', urs.id_rol,
          'id_iglesia', urs.id_iglesia,
          'id_sede', urs.id_sede,
          'fecha_fin', urs.fecha_fin,
          'rol_nombre', r.nombre,
          'iglesia_nombre', i.nombre,
          'sede_nombre', s.nombre,
          'source', 'usuario_rol_sede'
        ) AS role_row
        FROM public.usuario_rol_sede urs
        JOIN public.rol r ON r.id_rol = urs.id_rol
        JOIN public.iglesia i ON i.id_iglesia = urs.id_iglesia
        JOIN public.sede s ON s.id_sede = urs.id_sede
        WHERE urs.id_usuario = u.id_usuario
          AND urs.fecha_fin IS NULL
      ) roles_union
    ), '[]'::jsonb) AS roles,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id_ministerio', m.id_ministerio,
        'ministerio_nombre', m.nombre,
        'rol_en_ministerio', mm.rol_en_ministerio
      ) ORDER BY m.nombre)
      FROM public.miembro_ministerio mm
      JOIN public.ministerio m ON m.id_ministerio = mm.id_ministerio
      WHERE mm.id_usuario = u.id_usuario
        AND mm.fecha_salida IS NULL
    ), '[]'::jsonb) AS ministerios
  FROM public.usuario u
  JOIN visible_users vu ON vu.id_usuario = u.id_usuario
  ORDER BY u.apellidos, u.nombres;
$$;

REVOKE EXECUTE ON FUNCTION public.get_all_usuarios_enriquecidos() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_all_usuarios_enriquecidos() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_usuarios_enriquecidos_scoped() TO authenticated;

DROP POLICY IF EXISTS "aula_curso_admin_sede_select" ON public.aula_curso;
DROP POLICY IF EXISTS "aula_curso_admin_sede_insert" ON public.aula_curso;
DROP POLICY IF EXISTS "aula_curso_admin_sede_update" ON public.aula_curso;
DROP POLICY IF EXISTS "aula_curso_admin_sede_delete" ON public.aula_curso;

CREATE POLICY "aula_curso_admin_sede_select" ON public.aula_curso
FOR SELECT TO authenticated
USING (
  public.is_admin_sede()
  AND NOT public.is_admin_iglesia()
  AND id_ministerio IS NOT NULL
  AND public.can_manage_ministerio(id_ministerio)
);

CREATE POLICY "aula_curso_admin_sede_insert" ON public.aula_curso
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_sede()
  AND NOT public.is_admin_iglesia()
  AND id_ministerio IS NOT NULL
  AND public.can_manage_ministerio(id_ministerio)
);

CREATE POLICY "aula_curso_admin_sede_update" ON public.aula_curso
FOR UPDATE TO authenticated
USING (
  public.is_admin_sede()
  AND NOT public.is_admin_iglesia()
  AND id_ministerio IS NOT NULL
  AND public.can_manage_ministerio(id_ministerio)
)
WITH CHECK (
  public.is_admin_sede()
  AND NOT public.is_admin_iglesia()
  AND id_ministerio IS NOT NULL
  AND public.can_manage_ministerio(id_ministerio)
);

CREATE POLICY "aula_curso_admin_sede_delete" ON public.aula_curso
FOR DELETE TO authenticated
USING (
  public.is_admin_sede()
  AND NOT public.is_admin_iglesia()
  AND id_ministerio IS NOT NULL
  AND public.can_manage_ministerio(id_ministerio)
);

DROP POLICY IF EXISTS "aula_modulo_admin_sede_select" ON public.aula_modulo;
DROP POLICY IF EXISTS "aula_modulo_admin_sede_insert" ON public.aula_modulo;
DROP POLICY IF EXISTS "aula_modulo_admin_sede_update" ON public.aula_modulo;
DROP POLICY IF EXISTS "aula_modulo_admin_sede_delete" ON public.aula_modulo;

CREATE POLICY "aula_modulo_admin_sede_select" ON public.aula_modulo
FOR SELECT TO authenticated
USING (
  public.is_admin_sede()
  AND NOT public.is_admin_iglesia()
  AND EXISTS (
    SELECT 1
    FROM public.aula_curso c
    WHERE c.id_aula_curso = aula_modulo.id_aula_curso
      AND c.id_ministerio IS NOT NULL
      AND public.can_manage_ministerio(c.id_ministerio)
  )
);

CREATE POLICY "aula_modulo_admin_sede_insert" ON public.aula_modulo
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_sede()
  AND NOT public.is_admin_iglesia()
  AND EXISTS (
    SELECT 1
    FROM public.aula_curso c
    WHERE c.id_aula_curso = aula_modulo.id_aula_curso
      AND c.id_ministerio IS NOT NULL
      AND public.can_manage_ministerio(c.id_ministerio)
  )
);

CREATE POLICY "aula_modulo_admin_sede_update" ON public.aula_modulo
FOR UPDATE TO authenticated
USING (
  public.is_admin_sede()
  AND NOT public.is_admin_iglesia()
  AND EXISTS (
    SELECT 1
    FROM public.aula_curso c
    WHERE c.id_aula_curso = aula_modulo.id_aula_curso
      AND c.id_ministerio IS NOT NULL
      AND public.can_manage_ministerio(c.id_ministerio)
  )
)
WITH CHECK (
  public.is_admin_sede()
  AND NOT public.is_admin_iglesia()
  AND EXISTS (
    SELECT 1
    FROM public.aula_curso c
    WHERE c.id_aula_curso = aula_modulo.id_aula_curso
      AND c.id_ministerio IS NOT NULL
      AND public.can_manage_ministerio(c.id_ministerio)
  )
);

CREATE POLICY "aula_modulo_admin_sede_delete" ON public.aula_modulo
FOR DELETE TO authenticated
USING (
  public.is_admin_sede()
  AND NOT public.is_admin_iglesia()
  AND EXISTS (
    SELECT 1
    FROM public.aula_curso c
    WHERE c.id_aula_curso = aula_modulo.id_aula_curso
      AND c.id_ministerio IS NOT NULL
      AND public.can_manage_ministerio(c.id_ministerio)
  )
);

DROP POLICY IF EXISTS "Tarea select por rol" ON public.tarea;
DROP POLICY IF EXISTS "Tarea insert por lider" ON public.tarea;
DROP POLICY IF EXISTS "Tarea update por gestion" ON public.tarea;
DROP POLICY IF EXISTS "Tarea delete por gestion" ON public.tarea;

COMMIT;
