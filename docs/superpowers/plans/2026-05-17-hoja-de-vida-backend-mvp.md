# Hoja de Vida Backend MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a production-ready Hoja de Vida backend MVP aligned with current frontend, including role-scoped decision views and certificate visibility.

**Architecture:** Apply incremental Supabase migrations to normalize `hoja_de_vida`, add decision-support tables (`revision`, `etiquetas`, `disponibilidad`), and publish stable RPCs for detailed profile and scoped listing. Then adapt TypeScript services/hooks to new contracts while preserving UI behavior and role-based access through RLS.

**Tech Stack:** Supabase Postgres (SQL, RLS, RPC), React 18 + TypeScript, Vite, existing app services/hooks.

---

## File Structure (planned changes)

- Create: `supabase/migrations/20260517_hdv_schema_normalization.sql` - normalize `hoja_de_vida` columns/types and migrate legacy data.
- Create: `supabase/migrations/20260517_hdv_decision_tables.sql` - create revision, etiquetas, disponibilidad tables with indexes and constraints.
- Create: `supabase/migrations/20260517_hdv_rls_policies.sql` - role-scoped policies for new/normalized entities.
- Create: `supabase/migrations/20260517_hdv_rpc_v2.sql` - `get_hoja_de_vida_completa_v2` and `listar_hojas_de_vida_scoped`.
- Modify: `src/types/database.types.ts` - refresh generated Supabase types.
- Modify: `src/services/hojaDeVida.service.ts` - migrate to RPC v2 and typed DTO mapping.
- Modify: `src/hooks/useHojaDeVida.ts` - adapt to v2 shape + realtime channels for new entities.
- Modify: `src/app/components/hojaDeVida/HojaDeVidaForm.tsx` - align payload fields with normalized schema.
- Modify: `src/app/components/hojaDeVida/HojaDeVidaView.tsx` - ensure certificados + revisions + availability rendering hooks (if already exposed).
- Modify: `HOJA_DE_VIDA_README.md` - update backend architecture and role matrix.

### Task 1: Baseline and Safety Snapshot

**Files:**
- Modify: `docs/audit/_supabase-start.log` (append migration baseline record if this repo uses this log)

- [ ] **Step 1: Capture current migration/table baseline**

Run: `npm run build`
Expected: Build succeeds before backend changes.

- [ ] **Step 2: Capture Supabase migration state**

Run: `supabase migration list`
Expected: Command lists applied/pending migrations; copy output into work notes.

- [ ] **Step 3: Commit baseline notes (if changed)**

```bash
git add docs/audit/_supabase-start.log
git commit -m "chore: capture hdv backend baseline"
```

### Task 2: Normalize `hoja_de_vida` schema

**Files:**
- Create: `supabase/migrations/20260517_hdv_schema_normalization.sql`

- [ ] **Step 1: Write migration SQL (failing assumption check first)**

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'hoja_de_vida'
  ) THEN
    RAISE EXCEPTION 'tabla hoja_de_vida no existe';
  END IF;
END $$;
```

- [ ] **Step 2: Add normalization SQL**

```sql
ALTER TABLE public.hoja_de_vida
  ADD COLUMN IF NOT EXISTS resumen_profesional TEXT,
  ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT,
  ADD COLUMN IF NOT EXISTS completa BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completada_en TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ DEFAULT NOW();

UPDATE public.hoja_de_vida
SET resumen_profesional = COALESCE(resumen_profesional, perfil_profesional)
WHERE resumen_profesional IS NULL;

ALTER TABLE public.hoja_de_vida
  ALTER COLUMN habilidades TYPE JSONB USING
    CASE
      WHEN habilidades IS NULL THEN '[]'::jsonb
      WHEN jsonb_typeof(habilidades::jsonb) IS NOT NULL THEN habilidades::jsonb
      ELSE '[]'::jsonb
    END;

ALTER TABLE public.hoja_de_vida
  ALTER COLUMN formacion_academica TYPE JSONB USING
    CASE
      WHEN formacion_academica IS NULL THEN '[]'::jsonb
      WHEN jsonb_typeof(formacion_academica::jsonb) IS NOT NULL THEN formacion_academica::jsonb
      ELSE '[]'::jsonb
    END;
```

- [ ] **Step 3: Apply migration**

Run: `supabase db push`
Expected: Migration applies without errors.

- [ ] **Step 4: Validate resulting columns**

Run: `supabase db diff --schema public`
Expected: No unexpected drift for `hoja_de_vida`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260517_hdv_schema_normalization.sql
git commit -m "feat(db): normalize hoja_de_vida schema for mvp"
```

### Task 3: Create decision-support tables

**Files:**
- Create: `supabase/migrations/20260517_hdv_decision_tables.sql`

- [ ] **Step 1: Write table DDL for revisions**

```sql
CREATE TABLE IF NOT EXISTS public.hoja_de_vida_revision (
  id_revision BIGSERIAL PRIMARY KEY,
  id_hoja_de_vida BIGINT NOT NULL REFERENCES public.hoja_de_vida(id_hoja_de_vida) ON DELETE CASCADE,
  id_revisor BIGINT NOT NULL REFERENCES public.usuario(id_usuario),
  rol_revisor TEXT NOT NULL,
  estado_revision TEXT NOT NULL CHECK (estado_revision IN ('pendiente','aprobada','observada')),
  observaciones TEXT,
  revisado_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 2: Write DDL for etiquetas and disponibilidad**

```sql
CREATE TABLE IF NOT EXISTS public.hoja_de_vida_etiqueta (
  id_etiqueta BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  categoria TEXT NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hoja_de_vida_etiqueta_usuario (
  id_hoja_de_vida BIGINT NOT NULL REFERENCES public.hoja_de_vida(id_hoja_de_vida) ON DELETE CASCADE,
  id_etiqueta BIGINT NOT NULL REFERENCES public.hoja_de_vida_etiqueta(id_etiqueta),
  asignada_por BIGINT NOT NULL REFERENCES public.usuario(id_usuario),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id_hoja_de_vida, id_etiqueta)
);

CREATE TABLE IF NOT EXISTS public.hoja_de_vida_disponibilidad (
  id_disponibilidad BIGSERIAL PRIMARY KEY,
  id_hoja_de_vida BIGINT NOT NULL REFERENCES public.hoja_de_vida(id_hoja_de_vida) ON DELETE CASCADE,
  id_sede BIGINT NOT NULL REFERENCES public.sede(id_sede),
  id_ministerio BIGINT REFERENCES public.ministerio(id_ministerio),
  dias_semana JSONB NOT NULL DEFAULT '[]'::jsonb,
  franja_horaria TEXT NOT NULL,
  modalidad TEXT NOT NULL CHECK (modalidad IN ('presencial','virtual','mixta')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 3: Add indexes + timestamps trigger**

```sql
CREATE INDEX IF NOT EXISTS idx_hdv_revision_hoja ON public.hoja_de_vida_revision(id_hoja_de_vida);
CREATE INDEX IF NOT EXISTS idx_hdv_revision_estado ON public.hoja_de_vida_revision(estado_revision);
CREATE INDEX IF NOT EXISTS idx_hdv_disponibilidad_sede_activo ON public.hoja_de_vida_disponibilidad(id_sede, activo);
CREATE INDEX IF NOT EXISTS idx_hdv_etiqueta_categoria ON public.hoja_de_vida_etiqueta(categoria);
```

- [ ] **Step 4: Apply and verify migration**

Run: `supabase db push`
Expected: New tables exist with constraints/indexes.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260517_hdv_decision_tables.sql
git commit -m "feat(db): add hoja de vida decision support tables"
```

### Task 4: Implement RLS policies for normalized/new entities

**Files:**
- Create: `supabase/migrations/20260517_hdv_rls_policies.sql`

- [ ] **Step 1: Enable RLS and drop conflicting policies safely**

```sql
ALTER TABLE public.hoja_de_vida ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoja_de_vida_revision ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoja_de_vida_etiqueta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoja_de_vida_etiqueta_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoja_de_vida_disponibilidad ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hdv_self_select ON public.hoja_de_vida;
DROP POLICY IF EXISTS hdv_self_update ON public.hoja_de_vida;
```

- [ ] **Step 2: Add owner and hierarchy-aware SELECT policies**

```sql
CREATE POLICY hdv_self_select ON public.hoja_de_vida
FOR SELECT TO authenticated
USING (id_usuario = public.current_user_id());

CREATE POLICY hdv_scoped_select ON public.hoja_de_vida
FOR SELECT TO authenticated
USING (public.user_can_view_usuario(id_usuario));
```

- [ ] **Step 3: Add mutation policies (self vs reviewers)**

```sql
CREATE POLICY hdv_self_update ON public.hoja_de_vida
FOR UPDATE TO authenticated
USING (id_usuario = public.current_user_id())
WITH CHECK (id_usuario = public.current_user_id());

CREATE POLICY hdv_revision_insert_scoped ON public.hoja_de_vida_revision
FOR INSERT TO authenticated
WITH CHECK (public.user_can_review_usuario((SELECT id_usuario FROM public.hoja_de_vida WHERE id_hoja_de_vida = hoja_de_vida_revision.id_hoja_de_vida)));
```

- [ ] **Step 4: Apply migration and smoke-test access matrix**

Run: `supabase db push`
Expected: Policies apply successfully.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260517_hdv_rls_policies.sql
git commit -m "feat(db): add scoped rls for hoja de vida mvp"
```

### Task 5: Add RPC v2 for profile detail and decision listing

**Files:**
- Create: `supabase/migrations/20260517_hdv_rpc_v2.sql`

- [ ] **Step 1: Implement `get_hoja_de_vida_completa_v2`**

```sql
CREATE OR REPLACE FUNCTION public.get_hoja_de_vida_completa_v2(p_id_usuario BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.user_can_view_usuario(p_id_usuario) AND p_id_usuario <> public.current_user_id() THEN
    RAISE EXCEPTION 'acceso denegado';
  END IF;

  SELECT jsonb_build_object(
    'hoja', to_jsonb(h),
    'usuario', jsonb_build_object('id_usuario', u.id_usuario, 'nombres', u.nombres, 'apellidos', u.apellidos, 'correo', u.correo),
    'etiquetas', COALESCE((SELECT jsonb_agg(jsonb_build_object('id_etiqueta', e.id_etiqueta, 'nombre', e.nombre, 'categoria', e.categoria))
                           FROM public.hoja_de_vida_etiqueta_usuario heu
                           JOIN public.hoja_de_vida_etiqueta e ON e.id_etiqueta = heu.id_etiqueta
                           WHERE heu.id_hoja_de_vida = h.id_hoja_de_vida), '[]'::jsonb),
    'disponibilidad', COALESCE((SELECT jsonb_agg(to_jsonb(d)) FROM public.hoja_de_vida_disponibilidad d WHERE d.id_hoja_de_vida = h.id_hoja_de_vida), '[]'::jsonb),
    'revisiones', COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.creado_en DESC) FROM public.hoja_de_vida_revision r WHERE r.id_hoja_de_vida = h.id_hoja_de_vida), '[]'::jsonb),
    'certificados', COALESCE((SELECT jsonb_agg(jsonb_build_object('id_aula_certificado', c.id_aula_certificado, 'id_aula_curso', c.id_aula_curso, 'titulo_curso', ac.nombre, 'fecha_emision', c.fecha_certificacion, 'numero_certificado', c.numero_certificado))
                              FROM public.aula_certificado c
                              LEFT JOIN public.aula_curso ac ON ac.id_aula_curso = c.id_aula_curso
                              WHERE c.id_usuario = u.id_usuario), '[]'::jsonb)
  ) INTO v_result
  FROM public.usuario u
  LEFT JOIN public.hoja_de_vida h ON h.id_usuario = u.id_usuario
  WHERE u.id_usuario = p_id_usuario;

  RETURN v_result;
END;
$$;
```

- [ ] **Step 2: Implement `listar_hojas_de_vida_scoped` with JSON filters**

```sql
CREATE OR REPLACE FUNCTION public.listar_hojas_de_vida_scoped(filtros JSONB DEFAULT '{}'::jsonb)
RETURNS SETOF JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_hoja_de_vida_completa_v2(h.id_usuario)
  FROM public.hoja_de_vida h
  WHERE public.user_can_view_usuario(h.id_usuario)
    AND (filtros ? 'completa' IS FALSE OR h.completa = (filtros->>'completa')::boolean)
  ORDER BY h.actualizado_en DESC
  LIMIT COALESCE((filtros->>'limit')::int, 100);
$$;
```

- [ ] **Step 3: Apply migration and function smoke test**

Run: `supabase db push`
Expected: RPC functions created.

- [ ] **Step 4: Validate RPC execution in SQL editor**

Run: `select public.get_hoja_de_vida_completa_v2(<id_usuario_prueba>);`
Expected: JSON payload includes `certificados` key.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260517_hdv_rpc_v2.sql
git commit -m "feat(db): add hoja de vida rpc v2 for scoped decisions"
```

### Task 6: Regenerate and align TypeScript database types

**Files:**
- Modify: `src/types/database.types.ts`

- [ ] **Step 1: Regenerate types**

Run: `npm run supabase:types`
Expected: `database.types.ts` includes new tables/functions (if script exists).

- [ ] **Step 2: If script is missing, use Supabase CLI command**

Run: `supabase gen types typescript --linked > src/types/database.types.ts`
Expected: File updated with latest schema.

- [ ] **Step 3: Type-check compile**

Run: `npm run build`
Expected: Type generation does not break compilation yet.

- [ ] **Step 4: Commit**

```bash
git add src/types/database.types.ts
git commit -m "chore(types): regenerate supabase schema types for hdv mvp"
```

### Task 7: Refactor Hoja de Vida service to v2 contracts

**Files:**
- Modify: `src/services/hojaDeVida.service.ts`

- [ ] **Step 1: Add DTO types for RPC v2 payload**

```ts
export interface HojaDeVidaCompletaV2 {
  hoja: HojaDeVida | null;
  usuario: { id_usuario: number; nombres: string; apellidos: string; correo: string };
  etiquetas: Array<{ id_etiqueta: number; nombre: string; categoria: string }>;
  disponibilidad: Array<Record<string, unknown>>;
  revisiones: Array<Record<string, unknown>>;
  certificados: Array<{
    id_aula_certificado: number;
    id_aula_curso: number;
    titulo_curso: string;
    fecha_emision: string;
    numero_certificado: string;
  }>;
}
```

- [ ] **Step 2: Replace old RPC calls with v2**

```ts
const { data, error } = await supabase.rpc('get_hoja_de_vida_completa_v2', {
  p_id_usuario: idUsuario,
});
```

- [ ] **Step 3: Add scoped listing method**

```ts
export async function listarHojasDeVidaScoped(filtros: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('listar_hojas_de_vida_scoped', { filtros });
  if (error) throw error;
  return (data ?? []) as HojaDeVidaCompletaV2[];
}
```

- [ ] **Step 4: Build to verify type correctness**

Run: `npm run build`
Expected: Service compiles with new RPC contracts.

- [ ] **Step 5: Commit**

```bash
git add src/services/hojaDeVida.service.ts
git commit -m "feat(hdv): migrate service layer to rpc v2"
```

### Task 8: Update hooks for realtime + decision data

**Files:**
- Modify: `src/hooks/useHojaDeVida.ts`

- [ ] **Step 1: Update state shape to include v2 payload blocks**

```ts
export interface UseHojaDeVidaState {
  hoja: hojaDeVidaService.HojaDeVidaCompletaV2 | null;
  loading: boolean;
  error: string | null;
  isUpdating: boolean;
}
```

- [ ] **Step 2: Update fetch functions to use v2 service methods**

```ts
const hoja = await hojaDeVidaService.getHojaDeVidaActualV2();
```

- [ ] **Step 3: Extend realtime subscriptions for new tables**

```ts
supabase
  .channel(`hoja_de_vida_scope_${idUsuario}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'hoja_de_vida', filter: `id_usuario=eq.${idUsuario}` }, fetchHoja)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'hoja_de_vida_revision' }, fetchHoja)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'hoja_de_vida_etiqueta_usuario' }, fetchHoja)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'hoja_de_vida_disponibilidad' }, fetchHoja)
  .subscribe();
```

- [ ] **Step 4: Build and validate hook consumers**

Run: `npm run build`
Expected: `ProfilePage` and modal consumers compile.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useHojaDeVida.ts
git commit -m "feat(hdv): update hooks for v2 payload and realtime"
```

### Task 9: UI contract alignment (no redesign)

**Files:**
- Modify: `src/app/components/hojaDeVida/HojaDeVidaForm.tsx`
- Modify: `src/app/components/hojaDeVida/HojaDeVidaView.tsx`

- [ ] **Step 1: Align form submit payload with normalized fields**

```ts
await onGuardar({
  resumen_profesional: data.resumen_profesional || null,
  experiencia_laboral: data.experiencia_laboral || null,
  foto_perfil_url: data.foto_perfil_url || null,
  habilidades: data.habilidades as any,
  formacion_academica: data.formacion_academica as any,
});
```

- [ ] **Step 2: Ensure view reads certificados from v2 payload consistently**

```ts
const certificados = hoja?.certificados ?? [];
```

- [ ] **Step 3: Add safe rendering for optional revision/disponibilidad blocks**

```tsx
{hoja?.revisiones?.length ? <RevisionSummary revisiones={hoja.revisiones} /> : null}
```

- [ ] **Step 4: Build and manual smoke test**

Run: `npm run dev`
Expected: Profile tab and user modal render without runtime errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/hojaDeVida/HojaDeVidaForm.tsx src/app/components/hojaDeVida/HojaDeVidaView.tsx
git commit -m "feat(hdv-ui): align form/view with backend mvp contract"
```

### Task 10: Documentation and rollout checklist

**Files:**
- Modify: `HOJA_DE_VIDA_README.md`

- [ ] **Step 1: Update architecture section**

```md
## Backend MVP (Decision-Oriented)
- RPC v2: `get_hoja_de_vida_completa_v2`, `listar_hojas_de_vida_scoped`
- Tables: `hoja_de_vida_revision`, `hoja_de_vida_etiqueta`, `hoja_de_vida_etiqueta_usuario`, `hoja_de_vida_disponibilidad`
- Includes certificados/cursos in profile detail
```

- [ ] **Step 2: Add role matrix and access examples**

```md
- Lider: alcance por ministerio
- Admin sede: alcance por sede
- Admin iglesia: alcance por iglesia
- Superadmin: alcance global
```

- [ ] **Step 3: Add operational checklist**

```md
1. Apply migrations
2. Validate RLS by role
3. Validate certificados visibility
4. Validate scoped filters
```

- [ ] **Step 4: Commit**

```bash
git add HOJA_DE_VIDA_README.md
git commit -m "docs: update hoja de vida mvp backend operations"
```

### Task 11: Final verification gate

**Files:**
- Modify: none (verification only)

- [ ] **Step 1: Run full build verification**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 2: Run migration drift check**

Run: `supabase db diff --schema public`
Expected: No unintended diffs.

- [ ] **Step 3: Role-based SQL smoke checks**

Run (examples):
`select public.get_hoja_de_vida_completa_v2(<id_usuario>);`
`select * from public.listar_hojas_de_vida_scoped('{"limit":20}'::jsonb);`
Expected: Authorized roles return data; unauthorized contexts fail with access denied.

- [ ] **Step 4: Final commit (if any verification scripts/docs changed)**

```bash
git add -A
git commit -m "chore: finalize hoja de vida backend mvp verification"
```

## Spec Coverage Check

- Data normalization: covered by Task 2.
- Decision tables (revision/etiquetas/disponibilidad): covered by Task 3.
- RLS by hierarchy: covered by Task 4.
- RPC detail/listing with certificados: covered by Task 5.
- Services/hooks adaptation: covered by Tasks 7 and 8.
- UI compatibility (no redesign): covered by Task 9.
- Documentation and operations: covered by Task 10.
- Acceptance verification: covered by Task 11.

No uncovered requirements found from spec `docs/superpowers/specs/2026-05-16-hoja-de-vida-backend-mvp-design.md`.
