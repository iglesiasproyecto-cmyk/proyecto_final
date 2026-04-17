-- Hardening miembro_ministerio mutation scope + active-membership uniqueness
-- 1) Replace permissive mutation policies with scoped policies.
-- 2) Guarantee only one active membership per (usuario, ministerio).

-- Close duplicate active rows first so partial unique index can be created safely.
WITH ranked AS (
  SELECT
    id_miembro_ministerio,
    ROW_NUMBER() OVER (
      PARTITION BY id_usuario, id_ministerio
      ORDER BY fecha_ingreso DESC, id_miembro_ministerio DESC
    ) AS rn
  FROM public.miembro_ministerio
  WHERE fecha_salida IS NULL
)
UPDATE public.miembro_ministerio mm
SET fecha_salida = CURRENT_DATE,
    updated_at = now()
FROM ranked r
WHERE mm.id_miembro_ministerio = r.id_miembro_ministerio
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS miembro_ministerio_unq_activo_usuario_ministerio
  ON public.miembro_ministerio (id_usuario, id_ministerio)
  WHERE fecha_salida IS NULL;

-- Drop all existing mutation policies on miembro_ministerio to avoid permissive leftovers.
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'miembro_ministerio'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.miembro_ministerio', p.policyname);
  END LOOP;
END
$$;

-- Scoped INSERT: only super admin, iglesia admins of target ministry, or leaders of that ministry.
CREATE POLICY "Scoped insert miembro_ministerio"
  ON public.miembro_ministerio FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = miembro_ministerio.id_ministerio
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
      OR miembro_ministerio.id_ministerio IN (
        SELECT id_ministerio::integer
        FROM public.get_user_ministerios()
      )
    )
  );

-- Scoped UPDATE over existing rows.
CREATE POLICY "Scoped update miembro_ministerio"
  ON public.miembro_ministerio FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = miembro_ministerio.id_ministerio
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
      OR miembro_ministerio.id_ministerio IN (
        SELECT id_ministerio::integer
        FROM public.get_user_ministerios()
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = miembro_ministerio.id_ministerio
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
      OR miembro_ministerio.id_ministerio IN (
        SELECT id_ministerio::integer
        FROM public.get_user_ministerios()
      )
    )
  );

-- Scoped DELETE over existing rows.
CREATE POLICY "Scoped delete miembro_ministerio"
  ON public.miembro_ministerio FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1
        FROM public.ministerio m
        JOIN public.sede s ON s.id_sede = m.id_sede
        WHERE m.id_ministerio = miembro_ministerio.id_ministerio
          AND s.id_iglesia IN (SELECT id_iglesia FROM public.get_user_iglesias())
      )
      OR miembro_ministerio.id_ministerio IN (
        SELECT id_ministerio::integer
        FROM public.get_user_ministerios()
      )
    )
  );
