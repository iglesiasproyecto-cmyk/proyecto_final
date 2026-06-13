-- ============================================================
-- Migration: fix_disponibilidad_rls
--
-- Patches applied to disponibilidad after 20260613000000_disponibilidad_table.sql:
--
-- Fix 1 (Critical):  select_lider used strict equality on rol_en_ministerio,
--                    breaking variant spellings like 'Líder', 'lider de adoración'.
--                    Replaced with get_my_ministerios_as_lider() (SETOF bigint).
--
-- Fix 2 (Critical):  update_own had no WITH CHECK, allowing a user to
--                    reassign rows to another usuario_id on update.
--
-- Fix 3 (Important): Add coherence CHECK constraint so that
--                    fecha_especifica rows must have fecha and recurrente
--                    rows must have patron.
--
-- Fix 4 (Important): Replace low-cardinality index idx_disponibilidad_activo
--                    with composite index (usuario_id, activo) which is actually
--                    useful for the common per-user query pattern.
--
-- Fix 5 (Important): select_admin lacked tenant scoping for admin_iglesia /
--                    admin_sede — they could read any user's availability.
--                    Uses get_usuarios_iglesia() (SECURITY DEFINER, returns
--                    BIGINT[]) to safely check the target user belongs to the
--                    admin's church without triggering RLS recursion.
-- ============================================================

-- ── Fix 1: select_lider — use get_my_ministerios_as_lider() ──────────────────
DROP POLICY IF EXISTS "disponibilidad_select_lider" ON disponibilidad;
CREATE POLICY "disponibilidad_select_lider"
  ON disponibilidad FOR SELECT
  TO authenticated
  USING (
    public.is_lider()
    AND EXISTS (
      SELECT 1
      FROM miembro_ministerio mm
      WHERE mm.id_usuario = disponibilidad.usuario_id
        AND mm.id_ministerio IN (SELECT public.get_my_ministerios_as_lider())
        AND mm.fecha_salida IS NULL
    )
  );

-- ── Fix 2: update_own — add WITH CHECK ───────────────────────────────────────
DROP POLICY IF EXISTS "disponibilidad_update_own" ON disponibilidad;
CREATE POLICY "disponibilidad_update_own"
  ON disponibilidad FOR UPDATE
  TO authenticated
  USING (usuario_id = public.current_usuario_id())
  WITH CHECK (usuario_id = public.current_usuario_id());

-- ── Fix 3: coherence CHECK constraint ────────────────────────────────────────
-- Postgres does not support ADD CONSTRAINT IF NOT EXISTS, so use DO block.
DO $$
BEGIN
  ALTER TABLE disponibilidad
    ADD CONSTRAINT chk_tipo_campos CHECK (
      (tipo = 'fecha_especifica' AND fecha IS NOT NULL)
      OR (tipo = 'recurrente' AND patron IS NOT NULL)
    );
EXCEPTION WHEN duplicate_object THEN
  NULL; -- constraint already exists, nothing to do
END $$;

-- ── Fix 4: replace useless activo index with composite index ─────────────────
DROP INDEX IF EXISTS idx_disponibilidad_activo;
CREATE INDEX IF NOT EXISTS idx_disponibilidad_usuario_activo ON disponibilidad(usuario_id, activo);

-- ── Fix 5: select_admin — add tenant scoping for non-super-admin roles ────────
-- get_usuarios_iglesia(bigint) is SECURITY DEFINER and returns BIGINT[] of
-- users in the given church (via usuario_rol_sede), safe against RLS recursion.
DROP POLICY IF EXISTS "disponibilidad_select_admin" ON disponibilidad;
CREATE POLICY "disponibilidad_select_admin"
  ON disponibilidad FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      (public.is_admin_iglesia() OR public.is_admin_sede())
      AND disponibilidad.usuario_id = ANY(
        public.get_usuarios_iglesia(public.get_my_tenant_id())
      )
    )
  );
