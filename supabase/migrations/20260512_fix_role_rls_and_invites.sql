-- Fix role scoping, invite tokens, and admin policies
-- - Adds usuario_rol_sede table with RLS
-- - Adds invite_tokens table (if missing)
-- - Updates get_my_roles and role helpers
-- - Adds admin policies for iglesia_pastor and sede_pastor
-- - Removes permissive authenticated policies

-- usuario_rol_sede table
CREATE TABLE IF NOT EXISTS public.usuario_rol_sede (
  id_usuario_rol_sede BIGSERIAL PRIMARY KEY,
  id_usuario BIGINT NOT NULL REFERENCES public.usuario(id_usuario),
  id_rol BIGINT NOT NULL REFERENCES public.rol(id_rol),
  id_iglesia BIGINT NOT NULL REFERENCES public.iglesia(id_iglesia),
  id_sede BIGINT NOT NULL REFERENCES public.sede(id_sede),
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin DATE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_usuario, id_rol, id_sede)
);

DROP TRIGGER IF EXISTS set_updated_at_usuario_rol_sede ON public.usuario_rol_sede;
CREATE TRIGGER set_updated_at_usuario_rol_sede
  BEFORE UPDATE ON public.usuario_rol_sede
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

ALTER TABLE public.usuario_rol_sede ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usuario_rol_sede_select ON public.usuario_rol_sede;
DROP POLICY IF EXISTS usuario_rol_sede_insert ON public.usuario_rol_sede;
DROP POLICY IF EXISTS usuario_rol_sede_update ON public.usuario_rol_sede;
DROP POLICY IF EXISTS usuario_rol_sede_delete ON public.usuario_rol_sede;

CREATE POLICY usuario_rol_sede_select ON public.usuario_rol_sede
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR id_usuario = public.get_my_usuario_id()
    OR (public.is_admin_iglesia() AND id_iglesia = public.get_my_tenant_id())
  );

CREATE POLICY usuario_rol_sede_insert ON public.usuario_rol_sede
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND id_iglesia = public.get_my_tenant_id()
      AND id_rol NOT IN (SELECT id_rol FROM public.rol WHERE nombre ILIKE '%super%')
    )
  );

CREATE POLICY usuario_rol_sede_update ON public.usuario_rol_sede
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_admin_iglesia() AND id_iglesia = public.get_my_tenant_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND id_iglesia = public.get_my_tenant_id()
      AND id_rol NOT IN (SELECT id_rol FROM public.rol WHERE nombre ILIKE '%super%')
    )
  );

CREATE POLICY usuario_rol_sede_delete ON public.usuario_rol_sede
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_admin_iglesia() AND id_iglesia = public.get_my_tenant_id())
  );

-- invite_tokens table
CREATE TABLE IF NOT EXISTS public.invite_tokens (
  id_invite_token BIGSERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  id_iglesia BIGINT NOT NULL REFERENCES public.iglesia(id_iglesia),
  id_rol BIGINT NOT NULL REFERENCES public.rol(id_rol),
  id_sede BIGINT REFERENCES public.sede(id_sede),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_updated_at_invite_tokens ON public.invite_tokens;
CREATE TRIGGER set_updated_at_invite_tokens
  BEFORE UPDATE ON public.invite_tokens
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- Replace get_my_roles to include usuario_rol_sede
CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS TABLE (
  id_rol bigint,
  fecha_fin date,
  rol_nombre text,
  iglesia_id bigint,
  iglesia_nombre text,
  sede_id bigint,
  sede_nombre text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    ur.id_rol,
    ur.fecha_fin,
    r.nombre AS rol_nombre,
    CASE
      WHEN r.nombre = 'Super Administrador' THEN NULL
      ELSE i.id_iglesia
    END AS iglesia_id,
    CASE
      WHEN r.nombre = 'Super Administrador' THEN NULL
      ELSE i.nombre
    END AS iglesia_nombre,
    NULL::bigint AS sede_id,
    NULL::text AS sede_nombre
  FROM public.usuario_rol ur
  JOIN public.rol r ON r.id_rol = ur.id_rol
  LEFT JOIN public.iglesia i ON i.id_iglesia = ur.id_iglesia
  WHERE ur.id_usuario = (
    SELECT id_usuario FROM public.usuario WHERE auth_user_id = auth.uid() LIMIT 1
  )
  AND ur.fecha_fin IS NULL

  UNION ALL

  SELECT
    urs.id_rol,
    urs.fecha_fin,
    r.nombre AS rol_nombre,
    i.id_iglesia AS iglesia_id,
    i.nombre AS iglesia_nombre,
    s.id_sede AS sede_id,
    s.nombre AS sede_nombre
  FROM public.usuario_rol_sede urs
  JOIN public.rol r ON r.id_rol = urs.id_rol
  LEFT JOIN public.iglesia i ON i.id_iglesia = urs.id_iglesia
  LEFT JOIN public.sede s ON s.id_sede = urs.id_sede
  WHERE urs.id_usuario = (
    SELECT id_usuario FROM public.usuario WHERE auth_user_id = auth.uid() LIMIT 1
  )
  AND urs.fecha_fin IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;

-- Role helpers for sede and lider
CREATE OR REPLACE FUNCTION public.is_admin_sede()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.usuario_rol_sede urs
    JOIN public.rol r ON r.id_rol = urs.id_rol
    WHERE urs.id_usuario = public.get_my_usuario_id()
    AND r.nombre ILIKE '%administrador de sede%'
    AND urs.fecha_fin IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_lider()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.usuario_rol ur
    JOIN public.rol r ON r.id_rol = ur.id_rol
    WHERE ur.id_usuario = public.get_my_usuario_id()
      AND r.nombre ILIKE '%lider%'
      AND ur.fecha_fin IS NULL
  ) OR EXISTS (
    SELECT 1
    FROM public.usuario_rol_sede urs
    JOIN public.rol r ON r.id_rol = urs.id_rol
    WHERE urs.id_usuario = public.get_my_usuario_id()
      AND r.nombre ILIKE '%lider%'
      AND urs.fecha_fin IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_admin_sede() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_lider() TO authenticated;

-- Remove permissive authenticated policies
DROP POLICY IF EXISTS "Authenticated insert ministerio" ON public.ministerio;
DROP POLICY IF EXISTS "Authenticated update ministerio" ON public.ministerio;
DROP POLICY IF EXISTS "Authenticated delete ministerio" ON public.ministerio;

DROP POLICY IF EXISTS "Authenticated insert miembro_ministerio" ON public.miembro_ministerio;
DROP POLICY IF EXISTS "Authenticated update miembro_ministerio" ON public.miembro_ministerio;
DROP POLICY IF EXISTS "Authenticated delete miembro_ministerio" ON public.miembro_ministerio;

DROP POLICY IF EXISTS "Authenticated insert evento" ON public.evento;
DROP POLICY IF EXISTS "Authenticated update evento" ON public.evento;
DROP POLICY IF EXISTS "Authenticated delete evento" ON public.evento;

DROP POLICY IF EXISTS "Authenticated insert tarea" ON public.tarea;
DROP POLICY IF EXISTS "Authenticated update tarea" ON public.tarea;
DROP POLICY IF EXISTS "Authenticated delete tarea" ON public.tarea;

DROP POLICY IF EXISTS "Authenticated insert tarea_asignada" ON public.tarea_asignada;
DROP POLICY IF EXISTS "Authenticated update tarea_asignada" ON public.tarea_asignada;
DROP POLICY IF EXISTS "Authenticated delete tarea_asignada" ON public.tarea_asignada;

DROP POLICY IF EXISTS "Authenticated insert curso" ON public.curso;
DROP POLICY IF EXISTS "Authenticated update curso" ON public.curso;
DROP POLICY IF EXISTS "Authenticated delete curso" ON public.curso;

DROP POLICY IF EXISTS "Authenticated insert modulo" ON public.modulo;
DROP POLICY IF EXISTS "Authenticated update modulo" ON public.modulo;
DROP POLICY IF EXISTS "Authenticated delete modulo" ON public.modulo;

DROP POLICY IF EXISTS "Authenticated insert evaluacion" ON public.evaluacion;
DROP POLICY IF EXISTS "Authenticated update evaluacion" ON public.evaluacion;
DROP POLICY IF EXISTS "Authenticated delete evaluacion" ON public.evaluacion;

DROP POLICY IF EXISTS "Authenticated update proceso_asignado_curso" ON public.proceso_asignado_curso;

-- Admin policies for iglesia_pastor
CREATE POLICY "iglesia_pastor_select_admin" ON public.iglesia_pastor
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_admin_iglesia() AND id_iglesia = public.get_my_tenant_id())
  );

CREATE POLICY "iglesia_pastor_insert_admin" ON public.iglesia_pastor
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_admin_iglesia() AND id_iglesia = public.get_my_tenant_id())
  );

CREATE POLICY "iglesia_pastor_update_admin" ON public.iglesia_pastor
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_admin_iglesia() AND id_iglesia = public.get_my_tenant_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_admin_iglesia() AND id_iglesia = public.get_my_tenant_id())
  );

CREATE POLICY "iglesia_pastor_delete_admin" ON public.iglesia_pastor
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_admin_iglesia() AND id_iglesia = public.get_my_tenant_id())
  );

-- Admin policies for sede_pastor
CREATE POLICY "sede_pastor_select_admin" ON public.sede_pastor
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.sede s
        WHERE s.id_sede = sede_pastor.id_sede
          AND s.id_iglesia = public.get_my_tenant_id()
      )
    )
  );

CREATE POLICY "sede_pastor_insert_admin" ON public.sede_pastor
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.sede s
        WHERE s.id_sede = id_sede
          AND s.id_iglesia = public.get_my_tenant_id()
      )
    )
  );

CREATE POLICY "sede_pastor_update_admin" ON public.sede_pastor
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.sede s
        WHERE s.id_sede = sede_pastor.id_sede
          AND s.id_iglesia = public.get_my_tenant_id()
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.sede s
        WHERE s.id_sede = id_sede
          AND s.id_iglesia = public.get_my_tenant_id()
      )
    )
  );

CREATE POLICY "sede_pastor_delete_admin" ON public.sede_pastor
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin_iglesia()
      AND EXISTS (
        SELECT 1 FROM public.sede s
        WHERE s.id_sede = sede_pastor.id_sede
          AND s.id_iglesia = public.get_my_tenant_id()
      )
    )
  );
