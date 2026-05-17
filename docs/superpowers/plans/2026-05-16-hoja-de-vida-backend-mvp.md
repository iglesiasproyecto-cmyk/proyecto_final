# Hoja de Vida Backend MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Hoja de Vida backend so leaders and admins can review servant profiles, assign tags, and query filtered lists for decision-making.

**Architecture:** Three new Supabase tables (revision, etiqueta system, disponibilidad) with RLS; two RPCs (`get_hoja_de_vida_completa_v2` and `listar_hojas_de_vida_scoped`); extended service and TanStack Query hooks; minimal UI additions for disponibilidad input and admin revision panel.

**Tech Stack:** Supabase PostgreSQL (SQL Editor), TypeScript, TanStack Query v5, shadcn/ui, Lucide icons, sonner toasts.

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| Supabase SQL Editor | Run SQL | Create 3 tables + RLS + seed etiquetas + 2 RPCs |
| `src/types/database.types.ts` | Modify | Add Row/Insert/Update types for the 3 new tables |
| `src/services/hojaDeVida.service.ts` | Modify | Add types + functions for revision, etiquetas, disponibilidad, scoped listing |
| `src/hooks/useHojaDeVida.ts` | Modify | Add TanStack Query hooks for new functionality |
| `src/app/components/hojaDeVida/HojaDeVidaForm.tsx` | Modify | Add Disponibilidad section tab |
| `src/app/components/hojaDeVida/HojaDeVidaModal.tsx` | Modify | Add RevisionPanel for admins/leaders |

---

### Task 1: SQL — New tables, RLS and seed etiquetas

**Files:**
- Run in Supabase Dashboard → SQL Editor

- [ ] **Step 1: Create the 3 new tables**

Open Supabase Dashboard → SQL Editor, paste and run:

```sql
-- ── Tabla de revisiones administrativas ──
CREATE TABLE IF NOT EXISTS public.hoja_de_vida_revision (
  id_revision       BIGSERIAL PRIMARY KEY,
  id_hoja_de_vida   BIGINT NOT NULL REFERENCES public.hoja_de_vida(id_hoja_de_vida) ON DELETE CASCADE,
  id_revisor        BIGINT NOT NULL REFERENCES public.usuario(id_usuario),
  rol_revisor       TEXT NOT NULL,
  estado_revision   TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (estado_revision IN ('pendiente', 'aprobada', 'observada')),
  observaciones     TEXT,
  revisado_en       TIMESTAMPTZ DEFAULT NOW(),
  creado_en         TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Catálogo de etiquetas de perfil ──
CREATE TABLE IF NOT EXISTS public.hoja_de_vida_etiqueta (
  id_etiqueta   BIGSERIAL PRIMARY KEY,
  nombre        TEXT NOT NULL UNIQUE,
  categoria     TEXT NOT NULL,
  activa        BOOLEAN DEFAULT true,
  creado_en     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Relación etiqueta ↔ hoja de vida ──
CREATE TABLE IF NOT EXISTS public.hoja_de_vida_etiqueta_usuario (
  id_hoja_de_vida   BIGINT NOT NULL REFERENCES public.hoja_de_vida(id_hoja_de_vida) ON DELETE CASCADE,
  id_etiqueta       BIGINT NOT NULL REFERENCES public.hoja_de_vida_etiqueta(id_etiqueta) ON DELETE CASCADE,
  asignada_por      BIGINT REFERENCES public.usuario(id_usuario),
  creado_en         TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id_hoja_de_vida, id_etiqueta)
);

-- ── Disponibilidad operativa del servidor ──
CREATE TABLE IF NOT EXISTS public.hoja_de_vida_disponibilidad (
  id_disponibilidad   BIGSERIAL PRIMARY KEY,
  id_hoja_de_vida     BIGINT NOT NULL REFERENCES public.hoja_de_vida(id_hoja_de_vida) ON DELETE CASCADE,
  id_sede             BIGINT REFERENCES public.sede(id_sede),
  id_ministerio       BIGINT REFERENCES public.ministerio(id_ministerio),
  dias_semana         TEXT[] DEFAULT '{}',
  franja_horaria      TEXT,
  modalidad           TEXT DEFAULT 'presencial'
                      CHECK (modalidad IN ('presencial', 'virtual', 'mixta')),
  activo              BOOLEAN DEFAULT true,
  creado_en           TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en      TIMESTAMPTZ DEFAULT NOW()
);
```

Expected: `Success. No rows returned.`

- [ ] **Step 2: Enable RLS and add policies**

```sql
-- Enable RLS
ALTER TABLE public.hoja_de_vida_revision        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoja_de_vida_etiqueta        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoja_de_vida_etiqueta_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoja_de_vida_disponibilidad  ENABLE ROW LEVEL SECURITY;

-- Helper: resolve current app user id
CREATE OR REPLACE FUNCTION public._current_app_user_id()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id_usuario FROM public.usuario WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Helper: check if current user has management role
CREATE OR REPLACE FUNCTION public._is_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuario_rol ur
    JOIN public.rol r ON ur.id_rol = r.id_rol
    WHERE ur.id_usuario = public._current_app_user_id()
      AND r.nombre IN ('super_admin', 'admin_iglesia', 'admin_sede', 'lider')
      AND (ur.fecha_fin IS NULL OR ur.fecha_fin > NOW())
  );
$$;

-- ── hoja_de_vida_revision ──
CREATE POLICY "revision_select" ON public.hoja_de_vida_revision FOR SELECT
  USING (
    -- propio propietario
    id_hoja_de_vida IN (
      SELECT id_hoja_de_vida FROM public.hoja_de_vida
      WHERE id_usuario = public._current_app_user_id()
    )
    OR id_revisor = public._current_app_user_id()
    OR public._is_manager()
  );

CREATE POLICY "revision_insert" ON public.hoja_de_vida_revision FOR INSERT
  WITH CHECK (public._is_manager());

CREATE POLICY "revision_update" ON public.hoja_de_vida_revision FOR UPDATE
  USING (id_revisor = public._current_app_user_id() OR public._is_manager());

-- ── hoja_de_vida_etiqueta ──
CREATE POLICY "etiqueta_select" ON public.hoja_de_vida_etiqueta FOR SELECT
  USING (activa = true);

-- ── hoja_de_vida_etiqueta_usuario ──
CREATE POLICY "etiqueta_usuario_select" ON public.hoja_de_vida_etiqueta_usuario FOR SELECT
  USING (
    id_hoja_de_vida IN (
      SELECT id_hoja_de_vida FROM public.hoja_de_vida
      WHERE id_usuario = public._current_app_user_id()
    )
    OR public._is_manager()
  );

CREATE POLICY "etiqueta_usuario_insert" ON public.hoja_de_vida_etiqueta_usuario FOR INSERT
  WITH CHECK (public._is_manager());

CREATE POLICY "etiqueta_usuario_delete" ON public.hoja_de_vida_etiqueta_usuario FOR DELETE
  USING (public._is_manager());

-- ── hoja_de_vida_disponibilidad ──
CREATE POLICY "disponibilidad_select" ON public.hoja_de_vida_disponibilidad FOR SELECT
  USING (
    id_hoja_de_vida IN (
      SELECT id_hoja_de_vida FROM public.hoja_de_vida
      WHERE id_usuario = public._current_app_user_id()
    )
    OR public._is_manager()
  );

CREATE POLICY "disponibilidad_all" ON public.hoja_de_vida_disponibilidad FOR ALL
  USING (
    id_hoja_de_vida IN (
      SELECT id_hoja_de_vida FROM public.hoja_de_vida
      WHERE id_usuario = public._current_app_user_id()
    )
    OR public._is_manager()
  );
```

Expected: `Success. No rows returned.`

- [ ] **Step 3: Seed initial etiquetas**

```sql
INSERT INTO public.hoja_de_vida_etiqueta (nombre, categoria) VALUES
  ('Alabanza',       'musica'),
  ('Adoración',      'musica'),
  ('Predicación',    'ensenanza'),
  ('Enseñanza',      'ensenanza'),
  ('Discipulado',    'ensenanza'),
  ('Consejería',     'consejeria'),
  ('Administración', 'administracion'),
  ('Evangelismo',    'ministerio'),
  ('Intercesión',    'ministerio'),
  ('Diaconado',      'ministerio'),
  ('Infantil',       'ministerio'),
  ('Juventud',       'ministerio'),
  ('Sonido',         'tecnologia'),
  ('Video',          'tecnologia'),
  ('Diseño',         'tecnologia')
ON CONFLICT (nombre) DO NOTHING;
```

Expected: `15 rows affected` (or fewer if some already exist).

- [ ] **Step 4: Commit the SQL scripts for history**

Create `docs/sql/2026-05-16-hoja-de-vida-revision-etiqueta-disponibilidad.sql` with the SQL from steps 1-3 (copy-paste into a file, then commit):

```bash
git add docs/sql/
git commit -m "docs(sql): add hoja_de_vida_revision, etiqueta, disponibilidad migration scripts"
```

---

### Task 2: SQL — Two RPCs for profile detail and scoped listing

**Files:**
- Run in Supabase Dashboard → SQL Editor

- [ ] **Step 1: Create `get_hoja_de_vida_completa_v2`**

```sql
CREATE OR REPLACE FUNCTION public.get_hoja_de_vida_completa_v2(
  p_id_usuario bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_id bigint;
  v_target_id  bigint;
  v_result     jsonb;
BEGIN
  SELECT id_usuario INTO v_current_id
  FROM public.usuario WHERE auth_user_id = auth.uid();

  IF p_id_usuario IS NULL THEN
    v_target_id := v_current_id;
  ELSE
    -- Non-self lookup requires a management role
    IF p_id_usuario != v_current_id AND NOT public._is_manager() THEN
      RAISE EXCEPTION 'insufficient_scope';
    END IF;
    v_target_id := p_id_usuario;
  END IF;

  SELECT jsonb_build_object(
    'id_hoja_de_vida',    hdv.id_hoja_de_vida,
    'id_usuario',         hdv.id_usuario,
    'titulo_profesional', hdv.titulo_profesional,
    'resumen_profesional',hdv.resumen_profesional,
    'experiencia_laboral',hdv.experiencia_laboral,
    'habilidades',        hdv.habilidades,
    'formacion_academica',hdv.formacion_academica,
    'otros_datos',        hdv.otros_datos,
    'foto_perfil_url',    hdv.foto_perfil_url,
    'completa',           hdv.completa,
    'completada_en',      hdv.completada_en,
    'creado_en',          hdv.creado_en,
    'actualizado_en',     hdv.actualizado_en,
    'usuario', jsonb_build_object(
      'nombres',  u.nombres,
      'apellidos', u.apellidos,
      'correo',   u.correo
    ),
    'certificados', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id_aula_certificado', ac.id_aula_certificado,
        'id_aula_curso',       ac.id_aula_curso,
        'titulo_curso',        curso.titulo,
        'fecha_emision',       ac.fecha_emision,
        'numero_certificado',  ac.codigo_unico
      ) ORDER BY ac.fecha_emision DESC)
      FROM public.aula_certificado ac
      JOIN public.aula_curso curso ON ac.id_aula_curso = curso.id_aula_curso
      WHERE ac.id_usuario = v_target_id
    ), '[]'::jsonb),
    'etiquetas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id_etiqueta', e.id_etiqueta,
        'nombre',      e.nombre,
        'categoria',   e.categoria
      ))
      FROM public.hoja_de_vida_etiqueta_usuario heu
      JOIN public.hoja_de_vida_etiqueta e ON heu.id_etiqueta = e.id_etiqueta
      WHERE heu.id_hoja_de_vida = hdv.id_hoja_de_vida
    ), '[]'::jsonb),
    'disponibilidad', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id_disponibilidad', d.id_disponibilidad,
        'id_sede',           d.id_sede,
        'id_ministerio',     d.id_ministerio,
        'dias_semana',       d.dias_semana,
        'franja_horaria',    d.franja_horaria,
        'modalidad',         d.modalidad,
        'activo',            d.activo
      ))
      FROM public.hoja_de_vida_disponibilidad d
      WHERE d.id_hoja_de_vida = hdv.id_hoja_de_vida AND d.activo = true
    ), '[]'::jsonb),
    'ultima_revision', (
      SELECT jsonb_build_object(
        'id_revision',     rev.id_revision,
        'estado_revision', rev.estado_revision,
        'observaciones',   rev.observaciones,
        'revisado_en',     rev.revisado_en,
        'rol_revisor',     rev.rol_revisor
      )
      FROM public.hoja_de_vida_revision rev
      WHERE rev.id_hoja_de_vida = hdv.id_hoja_de_vida
      ORDER BY rev.revisado_en DESC
      LIMIT 1
    )
  ) INTO v_result
  FROM public.hoja_de_vida hdv
  JOIN public.usuario u ON hdv.id_usuario = u.id_usuario
  WHERE hdv.id_usuario = v_target_id;

  RETURN COALESCE(v_result, 'null'::jsonb);
END;
$$;
```

Expected: `Success. No rows returned.`

- [ ] **Step 2: Create `listar_hojas_de_vida_scoped`**

```sql
CREATE OR REPLACE FUNCTION public.listar_hojas_de_vida_scoped(
  p_id_iglesia    bigint  DEFAULT NULL,
  p_id_sede       bigint  DEFAULT NULL,
  p_id_ministerio bigint  DEFAULT NULL,
  p_solo_completas boolean DEFAULT NULL,
  p_estado_revision text  DEFAULT NULL,
  p_etiqueta_ids  bigint[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_id bigint;
  v_result     jsonb;
BEGIN
  SELECT id_usuario INTO v_current_id
  FROM public.usuario WHERE auth_user_id = auth.uid();

  IF NOT public._is_manager() THEN
    RAISE EXCEPTION 'insufficient_scope';
  END IF;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'apellidos')), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT DISTINCT ON (hdv.id_hoja_de_vida) jsonb_build_object(
      'id_hoja_de_vida',     hdv.id_hoja_de_vida,
      'id_usuario',          u.id_usuario,
      'nombres',             u.nombres,
      'apellidos',           u.apellidos,
      'correo',              u.correo,
      'titulo_profesional',  hdv.titulo_profesional,
      'completa',            hdv.completa,
      'completada_en',       hdv.completada_en,
      'actualizado_en',      hdv.actualizado_en,
      'cantidad_certificados', (
        SELECT COUNT(*) FROM public.aula_certificado ac WHERE ac.id_usuario = u.id_usuario
      ),
      'ultima_revision', (
        SELECT jsonb_build_object(
          'estado_revision', rev.estado_revision,
          'revisado_en',     rev.revisado_en
        )
        FROM public.hoja_de_vida_revision rev
        WHERE rev.id_hoja_de_vida = hdv.id_hoja_de_vida
        ORDER BY rev.revisado_en DESC LIMIT 1
      ),
      'etiquetas', COALESCE((
        SELECT jsonb_agg(e.nombre)
        FROM public.hoja_de_vida_etiqueta_usuario heu
        JOIN public.hoja_de_vida_etiqueta e ON heu.id_etiqueta = e.id_etiqueta
        WHERE heu.id_hoja_de_vida = hdv.id_hoja_de_vida
      ), '[]'::jsonb)
    ) AS row_data
    FROM public.hoja_de_vida hdv
    JOIN public.usuario u ON hdv.id_usuario = u.id_usuario
    LEFT JOIN public.miembro_ministerio mm ON mm.id_usuario = u.id_usuario AND mm.fecha_salida IS NULL
    LEFT JOIN public.ministerio min ON mm.id_ministerio = min.id_ministerio
    LEFT JOIN public.sede s ON min.id_sede = s.id_sede
    WHERE
      (p_id_iglesia    IS NULL OR s.id_iglesia    = p_id_iglesia)
      AND (p_id_sede   IS NULL OR min.id_sede     = p_id_sede)
      AND (p_id_ministerio IS NULL OR mm.id_ministerio = p_id_ministerio)
      AND (p_solo_completas IS NULL OR hdv.completa = p_solo_completas)
      AND (p_etiqueta_ids IS NULL OR EXISTS (
        SELECT 1 FROM public.hoja_de_vida_etiqueta_usuario heu
        WHERE heu.id_hoja_de_vida = hdv.id_hoja_de_vida
          AND heu.id_etiqueta = ANY(p_etiqueta_ids)
      ))
      AND (p_estado_revision IS NULL OR (
        SELECT rev.estado_revision FROM public.hoja_de_vida_revision rev
        WHERE rev.id_hoja_de_vida = hdv.id_hoja_de_vida
        ORDER BY rev.revisado_en DESC LIMIT 1
      ) = p_estado_revision)
  ) sub;

  RETURN v_result;
END;
$$;
```

Expected: `Success. No rows returned.`

- [ ] **Step 3: Test both RPCs in the SQL editor**

```sql
-- Should return JSON for the logged-in user (or null if no hoja yet)
SELECT public.get_hoja_de_vida_completa_v2();

-- Should return array of all hojas visible to caller
SELECT public.listar_hojas_de_vida_scoped();
```

Expected: JSON output, no error.

---

### Task 3: TypeScript types for the 3 new tables

**Files:**
- Modify: `src/types/database.types.ts` (before line 1351, inside the `Tables` block)

- [ ] **Step 1: Insert new table types after the `hoja_de_vida` block (line 1350)**

In `src/types/database.types.ts`, find `hoja_de_vida: {` block (ends at line 1350 with `}`). After its closing `}` and before the `}` that closes the `Tables` map (line 1351), insert:

```typescript
      hoja_de_vida_revision: {
        Row: {
          id_revision: number
          id_hoja_de_vida: number
          id_revisor: number
          rol_revisor: string
          estado_revision: 'pendiente' | 'aprobada' | 'observada'
          observaciones: string | null
          revisado_en: string
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id_revision?: number
          id_hoja_de_vida: number
          id_revisor: number
          rol_revisor: string
          estado_revision?: 'pendiente' | 'aprobada' | 'observada'
          observaciones?: string | null
          revisado_en?: string
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          estado_revision?: 'pendiente' | 'aprobada' | 'observada'
          observaciones?: string | null
          revisado_en?: string
          actualizado_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "hdv_revision_id_hoja_de_vida_fkey"
            columns: ["id_hoja_de_vida"]
            isOneToOne: false
            referencedRelation: "hoja_de_vida"
            referencedColumns: ["id_hoja_de_vida"]
          },
        ]
      }
      hoja_de_vida_etiqueta: {
        Row: {
          id_etiqueta: number
          nombre: string
          categoria: string
          activa: boolean
          creado_en: string
        }
        Insert: {
          id_etiqueta?: number
          nombre: string
          categoria: string
          activa?: boolean
          creado_en?: string
        }
        Update: {
          nombre?: string
          categoria?: string
          activa?: boolean
        }
        Relationships: []
      }
      hoja_de_vida_etiqueta_usuario: {
        Row: {
          id_hoja_de_vida: number
          id_etiqueta: number
          asignada_por: number | null
          creado_en: string
        }
        Insert: {
          id_hoja_de_vida: number
          id_etiqueta: number
          asignada_por?: number | null
          creado_en?: string
        }
        Update: {
          asignada_por?: number | null
        }
        Relationships: []
      }
      hoja_de_vida_disponibilidad: {
        Row: {
          id_disponibilidad: number
          id_hoja_de_vida: number
          id_sede: number | null
          id_ministerio: number | null
          dias_semana: string[]
          franja_horaria: string | null
          modalidad: 'presencial' | 'virtual' | 'mixta'
          activo: boolean
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id_disponibilidad?: number
          id_hoja_de_vida: number
          id_sede?: number | null
          id_ministerio?: number | null
          dias_semana?: string[]
          franja_horaria?: string | null
          modalidad?: 'presencial' | 'virtual' | 'mixta'
          activo?: boolean
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          id_sede?: number | null
          id_ministerio?: number | null
          dias_semana?: string[]
          franja_horaria?: string | null
          modalidad?: 'presencial' | 'virtual' | 'mixta'
          activo?: boolean
          actualizado_en?: string
        }
        Relationships: []
      }
```

- [ ] **Step 2: Verify build passes**

```bash
node_modules/.bin/vite build 2>&1 | tail -5
```
Expected: `✓ built in`

- [ ] **Step 3: Commit**

```bash
git add src/types/database.types.ts
git commit -m "feat(types): add hoja_de_vida_revision, etiqueta, and disponibilidad table types"
```

---

### Task 4: Extend `hojaDeVida.service.ts`

**Files:**
- Modify: `src/services/hojaDeVida.service.ts`

- [ ] **Step 1: Add new TypeScript interfaces at the top of the file (after existing interfaces)**

After the `FormacionAcademica` interface (around line 33), add:

```typescript
export interface EtiquetaPerfil {
  id_etiqueta: number
  nombre: string
  categoria: string
}

export interface RevisionHojaDeVida {
  id_revision: number
  id_hoja_de_vida: number
  id_revisor: number
  rol_revisor: string
  estado_revision: 'pendiente' | 'aprobada' | 'observada'
  observaciones: string | null
  revisado_en: string
}

export interface DisponibilidadPerfil {
  id_disponibilidad: number
  id_hoja_de_vida: number
  id_sede: number | null
  id_ministerio: number | null
  dias_semana: string[]
  franja_horaria: string | null
  modalidad: 'presencial' | 'virtual' | 'mixta'
  activo: boolean
}

export interface HojaDeVidaCompletaV2 {
  id_hoja_de_vida: number
  id_usuario: number
  titulo_profesional: string | null
  resumen_profesional: string | null
  experiencia_laboral: string | null
  habilidades: Habilidad[]
  formacion_academica: FormacionAcademica[]
  otros_datos: Record<string, unknown>
  foto_perfil_url: string | null
  completa: boolean
  completada_en: string | null
  creado_en: string
  actualizado_en: string
  usuario: { nombres: string; apellidos: string; correo: string }
  certificados: Array<{
    id_aula_certificado: number
    id_aula_curso: number
    titulo_curso: string
    fecha_emision: string
    numero_certificado: string
  }>
  etiquetas: EtiquetaPerfil[]
  disponibilidad: DisponibilidadPerfil[]
  ultima_revision: RevisionHojaDeVida | null
}

export interface HojaDeVidaListItem {
  id_hoja_de_vida: number
  id_usuario: number
  nombres: string
  apellidos: string
  correo: string
  titulo_profesional: string | null
  completa: boolean
  completada_en: string | null
  actualizado_en: string
  cantidad_certificados: number
  ultima_revision: { estado_revision: string; revisado_en: string } | null
  etiquetas: string[]
}
```

- [ ] **Step 2: Add service functions for v2 RPC, revision, etiquetas, disponibilidad — append at end of file**

```typescript
// ── v2 RPC calls ──

export async function getHojaDeVidaCompletaV2(): Promise<HojaDeVidaCompletaV2 | null> {
  const { data, error } = await supabase.rpc('get_hoja_de_vida_completa_v2' as any)
  if (error) throw error
  if (!data) return null
  const raw = data as any
  return {
    ...raw,
    habilidades: (raw.habilidades as Habilidad[]) ?? [],
    formacion_academica: (raw.formacion_academica as FormacionAcademica[]) ?? [],
    otros_datos: (raw.otros_datos as Record<string, unknown>) ?? {},
  }
}

export async function getHojaDeVidaCompletaV2PorUsuario(
  idUsuario: number
): Promise<HojaDeVidaCompletaV2 | null> {
  const { data, error } = await supabase.rpc('get_hoja_de_vida_completa_v2' as any, {
    p_id_usuario: idUsuario,
  })
  if (error) throw error
  if (!data) return null
  const raw = data as any
  return {
    ...raw,
    habilidades: (raw.habilidades as Habilidad[]) ?? [],
    formacion_academica: (raw.formacion_academica as FormacionAcademica[]) ?? [],
    otros_datos: (raw.otros_datos as Record<string, unknown>) ?? {},
  }
}

export async function listarHojasDeVidaScoped(filtros?: {
  idIglesia?: number
  idSede?: number
  idMinisterio?: number
  soloCompletas?: boolean
  estadoRevision?: 'pendiente' | 'aprobada' | 'observada'
  etiquetaIds?: number[]
}): Promise<HojaDeVidaListItem[]> {
  const { data, error } = await supabase.rpc('listar_hojas_de_vida_scoped' as any, {
    p_id_iglesia:     filtros?.idIglesia     ?? null,
    p_id_sede:        filtros?.idSede        ?? null,
    p_id_ministerio:  filtros?.idMinisterio  ?? null,
    p_solo_completas: filtros?.soloCompletas ?? null,
    p_estado_revision:filtros?.estadoRevision?? null,
    p_etiqueta_ids:   filtros?.etiquetaIds   ?? null,
  })
  if (error) throw error
  return (data as HojaDeVidaListItem[]) ?? []
}

// ── Revisiones ──

export async function crearRevision(input: {
  idHojaDeVida: number
  idRevisor: number
  rolRevisor: string
  estadoRevision: 'pendiente' | 'aprobada' | 'observada'
  observaciones?: string | null
}): Promise<RevisionHojaDeVida> {
  const { data, error } = await supabase
    .from('hoja_de_vida_revision')
    .insert({
      id_hoja_de_vida: input.idHojaDeVida,
      id_revisor: input.idRevisor,
      rol_revisor: input.rolRevisor,
      estado_revision: input.estadoRevision,
      observaciones: input.observaciones ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data as unknown as RevisionHojaDeVida
}

// ── Etiquetas ──

export async function getEtiquetas(): Promise<EtiquetaPerfil[]> {
  const { data, error } = await supabase
    .from('hoja_de_vida_etiqueta')
    .select('id_etiqueta, nombre, categoria')
    .eq('activa', true)
    .order('categoria')
    .order('nombre')
  if (error) throw error
  return data as EtiquetaPerfil[]
}

export async function asignarEtiqueta(input: {
  idHojaDeVida: number
  idEtiqueta: number
  asignadaPor: number
}): Promise<void> {
  const { error } = await supabase
    .from('hoja_de_vida_etiqueta_usuario')
    .insert({
      id_hoja_de_vida: input.idHojaDeVida,
      id_etiqueta: input.idEtiqueta,
      asignada_por: input.asignadaPor,
    })
  if (error && error.code !== '23505') throw error  // ignore duplicate
}

export async function removerEtiqueta(input: {
  idHojaDeVida: number
  idEtiqueta: number
}): Promise<void> {
  const { error } = await supabase
    .from('hoja_de_vida_etiqueta_usuario')
    .delete()
    .eq('id_hoja_de_vida', input.idHojaDeVida)
    .eq('id_etiqueta', input.idEtiqueta)
  if (error) throw error
}

// ── Disponibilidad ──

export async function upsertDisponibilidad(input: {
  idHojaDeVida: number
  idSede?: number | null
  idMinisterio?: number | null
  diasSemana: string[]
  franjaHoraria?: string | null
  modalidad: 'presencial' | 'virtual' | 'mixta'
}): Promise<DisponibilidadPerfil> {
  // one active disponibilidad record per hoja — upsert by idHojaDeVida match
  const existing = await supabase
    .from('hoja_de_vida_disponibilidad')
    .select('id_disponibilidad')
    .eq('id_hoja_de_vida', input.idHojaDeVida)
    .eq('activo', true)
    .maybeSingle()

  const patch = {
    id_hoja_de_vida: input.idHojaDeVida,
    id_sede: input.idSede ?? null,
    id_ministerio: input.idMinisterio ?? null,
    dias_semana: input.diasSemana,
    franja_horaria: input.franjaHoraria ?? null,
    modalidad: input.modalidad,
    activo: true,
    actualizado_en: new Date().toISOString(),
  }

  if (existing.data?.id_disponibilidad) {
    const { data, error } = await supabase
      .from('hoja_de_vida_disponibilidad')
      .update(patch)
      .eq('id_disponibilidad', existing.data.id_disponibilidad)
      .select()
      .single()
    if (error) throw error
    return data as unknown as DisponibilidadPerfil
  } else {
    const { data, error } = await supabase
      .from('hoja_de_vida_disponibilidad')
      .insert(patch)
      .select()
      .single()
    if (error) throw error
    return data as unknown as DisponibilidadPerfil
  }
}
```

- [ ] **Step 3: Verify build passes**

```bash
node_modules/.bin/vite build 2>&1 | tail -5
```
Expected: `✓ built in`

- [ ] **Step 4: Commit**

```bash
git add src/services/hojaDeVida.service.ts
git commit -m "feat(service): add v2 RPC calls, revision, etiquetas, and disponibilidad functions to hojaDeVida service"
```

---

### Task 5: TanStack Query hooks

**Files:**
- Modify: `src/hooks/useHojaDeVida.ts`

- [ ] **Step 1: Add TanStack Query import at the top**

In `src/hooks/useHojaDeVida.ts`, add at line 1 before existing imports:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getHojaDeVidaCompletaV2, getHojaDeVidaCompletaV2PorUsuario,
  listarHojasDeVidaScoped, crearRevision, getEtiquetas,
  asignarEtiqueta, removerEtiqueta, upsertDisponibilidad,
} from '@/services/hojaDeVida.service'
import type { RealtimeChannel } from '@supabase/supabase-js'
```

(The existing `useEffect, useState, useCallback` imports and the existing service import can remain — the new functions are additional.)

- [ ] **Step 2: Append new TanStack Query hooks at the end of the file**

After the closing brace of `useHojaDeVidaPorUsuario` (line 320), append:

```typescript
// ── TanStack Query hooks (v2) ──

export function useHojaDeVidaV2() {
  return useQuery({
    queryKey: ['hoja-de-vida-v2', 'me'],
    queryFn: () => getHojaDeVidaCompletaV2(),
    staleTime: 2 * 60 * 1000,
  })
}

export function useHojaDeVidaV2PorUsuario(idUsuario: number | null | undefined) {
  return useQuery({
    queryKey: ['hoja-de-vida-v2', idUsuario],
    queryFn: () => getHojaDeVidaCompletaV2PorUsuario(idUsuario!),
    enabled: !!idUsuario,
    staleTime: 2 * 60 * 1000,
  })
}

export function useListarHojasDeVidaScoped(filtros?: Parameters<typeof listarHojasDeVidaScoped>[0]) {
  return useQuery({
    queryKey: ['hojas-de-vida-scoped', filtros],
    queryFn: () => listarHojasDeVidaScoped(filtros),
    staleTime: 2 * 60 * 1000,
  })
}

export function useEtiquetasPerfil() {
  return useQuery({
    queryKey: ['etiquetas-perfil'],
    queryFn: getEtiquetas,
    staleTime: 10 * 60 * 1000,
  })
}

export function useCrearRevision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: crearRevision,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['hoja-de-vida-v2', variables.idHojaDeVida] })
      qc.invalidateQueries({ queryKey: ['hojas-de-vida-scoped'] })
    },
  })
}

export function useAsignarEtiqueta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: asignarEtiqueta,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hoja-de-vida-v2'] })
      qc.invalidateQueries({ queryKey: ['hojas-de-vida-scoped'] })
    },
  })
}

export function useRemoverEtiqueta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: removerEtiqueta,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hoja-de-vida-v2'] })
      qc.invalidateQueries({ queryKey: ['hojas-de-vida-scoped'] })
    },
  })
}

export function useUpsertDisponibilidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: upsertDisponibilidad,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hoja-de-vida-v2'] })
    },
  })
}
```

- [ ] **Step 3: Verify build passes**

```bash
node_modules/.bin/vite build 2>&1 | tail -5
```
Expected: `✓ built in`

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useHojaDeVida.ts
git commit -m "feat(hooks): add TanStack Query hooks for hoja de vida v2, revision, etiquetas, disponibilidad"
```

---

### Task 6: UI — Disponibilidad section in HojaDeVidaForm

**Files:**
- Modify: `src/app/components/hojaDeVida/HojaDeVidaForm.tsx`

The current form has sections for resumen, experiencia, habilidades and formación. Add a new "Disponibilidad" section at the bottom of the form.

- [ ] **Step 1: Add imports at the top of HojaDeVidaForm.tsx**

After the existing imports, add:

```typescript
import { useUpsertDisponibilidad } from '@/hooks/useHojaDeVida'
import type { DisponibilidadPerfil } from '@/services/hojaDeVida.service'
```

- [ ] **Step 2: Add `DisponibilidadSection` component (add before `HojaDeVidaForm` function)**

```typescript
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function DisponibilidadSection({
  idHojaDeVida,
  current,
}: {
  idHojaDeVida: number
  current: DisponibilidadPerfil | undefined
}) {
  const upsert = useUpsertDisponibilidad()
  const [dias, setDias] = React.useState<string[]>(current?.dias_semana ?? [])
  const [franja, setFranja] = React.useState(current?.franja_horaria ?? '')
  const [modalidad, setModalidad] = React.useState<'presencial' | 'virtual' | 'mixta'>(
    current?.modalidad ?? 'presencial'
  )

  const toggleDia = (dia: string) =>
    setDias(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia])

  const handleSave = () => {
    upsert.mutate(
      { idHojaDeVida, diasSemana: dias, franjaHoraria: franja || null, modalidad },
      {
        onSuccess: () => toast.success('Disponibilidad guardada'),
        onError: (e: any) => toast.error(`Error: ${e.message}`),
      }
    )
  }

  return (
    <div className="space-y-4 pt-4 border-t border-border/50">
      <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-widest">
        Disponibilidad
      </h3>
      <div>
        <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
          Días disponibles
        </label>
        <div className="flex flex-wrap gap-2">
          {DIAS.map(dia => (
            <button
              key={dia}
              type="button"
              onClick={() => toggleDia(dia)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                dias.includes(dia)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background/50 text-muted-foreground border-border/40 hover:border-primary/40'
              }`}
            >
              {dia}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Franja horaria
          </label>
          <input
            className="w-full h-10 rounded-xl border border-border/40 bg-background/50 px-3 text-sm"
            placeholder="Ej. Mañanas 8-12, Tardes"
            value={franja}
            onChange={e => setFranja(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Modalidad
          </label>
          <select
            className="w-full h-10 rounded-xl border border-border/40 bg-background/50 px-3 text-sm"
            value={modalidad}
            onChange={e => setModalidad(e.target.value as typeof modalidad)}
          >
            <option value="presencial">Presencial</option>
            <option value="virtual">Virtual</option>
            <option value="mixta">Mixta</option>
          </select>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="rounded-xl"
        onClick={handleSave}
        disabled={upsert.isPending}
      >
        {upsert.isPending ? 'Guardando...' : 'Guardar disponibilidad'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Wire DisponibilidadSection into the form**

In `HojaDeVidaForm.tsx`, find the bottom of the form's JSX (before the submit/cancel buttons at the bottom of the return), and add:

```typescript
{hojaActual?.id_hoja_de_vida && (
  <DisponibilidadSection
    idHojaDeVida={hojaActual.id_hoja_de_vida}
    current={undefined}  // will be populated once v2 hook is wired to ProfilePage
  />
)}
```

- [ ] **Step 4: Verify build passes**

```bash
node_modules/.bin/vite build 2>&1 | tail -5
```
Expected: `✓ built in`

- [ ] **Step 5: Commit**

```bash
git add src/app/components/hojaDeVida/HojaDeVidaForm.tsx
git commit -m "feat(ui): add DisponibilidadSection to HojaDeVidaForm"
```

---

### Task 7: UI — RevisionPanel in HojaDeVidaModal

**Files:**
- Modify: `src/app/components/hojaDeVida/HojaDeVidaModal.tsx`

The modal currently just shows the read-only view. Extend it so admins/leaders can review the profile (add observaciones + estado) and assign/remove etiquetas.

- [ ] **Step 1: Replace HojaDeVidaModal.tsx entirely**

```typescript
import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { HojaDeVidaView } from './HojaDeVidaView';
import {
  useHojaDeVidaV2PorUsuario, useCrearRevision,
  useEtiquetasPerfil, useAsignarEtiqueta, useRemoverEtiqueta,
} from '@/hooks/useHojaDeVida';
import { useApp } from '@/app/store/AppContext';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, Clock, Tag, X } from 'lucide-react';

const revisionColors = {
  aprobada: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  observada: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  pendiente: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

const revisionIcons = {
  aprobada: CheckCircle2,
  observada: AlertTriangle,
  pendiente: Clock,
}

interface HojaDeVidaModalProps {
  idUsuario: number | null;
  isOpen: boolean;
  onClose: () => void;
  nombreUsuario?: string;
  puedeRevisar?: boolean;
}

export function HojaDeVidaModal({
  idUsuario,
  isOpen,
  onClose,
  nombreUsuario = 'Usuario',
  puedeRevisar = false,
}: HojaDeVidaModalProps) {
  const { usuarioActual, rolActual } = useApp();
  const { data: hdv, isLoading } = useHojaDeVidaV2PorUsuario(isOpen ? idUsuario : null);
  const { data: todasEtiquetas = [] } = useEtiquetasPerfil();
  const crearRevisionMutation = useCrearRevision();
  const asignarEtiquetaMutation = useAsignarEtiqueta();
  const removerEtiquetaMutation = useRemoverEtiqueta();

  const [estadoRevision, setEstadoRevision] = useState<'aprobada' | 'observada' | 'pendiente'>('aprobada');
  const [observaciones, setObservaciones] = useState('');

  const etiquetasAsignadas = hdv?.etiquetas ?? [];
  const etiquetasDisponibles = todasEtiquetas.filter(
    e => !etiquetasAsignadas.some(ea => ea.id_etiqueta === e.id_etiqueta)
  );

  const handleRevision = () => {
    if (!hdv || !usuarioActual) return;
    crearRevisionMutation.mutate(
      {
        idHojaDeVida: hdv.id_hoja_de_vida,
        idRevisor: usuarioActual.idUsuario,
        rolRevisor: rolActual ?? 'lider',
        estadoRevision,
        observaciones: observaciones.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success('Revisión guardada exitosamente');
          setObservaciones('');
        },
        onError: (e: any) => toast.error(`Error: ${e.message}`),
      }
    );
  };

  const handleAsignarEtiqueta = (idEtiqueta: number) => {
    if (!hdv || !usuarioActual) return;
    asignarEtiquetaMutation.mutate(
      { idHojaDeVida: hdv.id_hoja_de_vida, idEtiqueta, asignadaPor: usuarioActual.idUsuario },
      {
        onSuccess: () => toast.success('Etiqueta asignada'),
        onError: (e: any) => toast.error(`Error: ${e.message}`),
      }
    );
  };

  const handleRemoverEtiqueta = (idEtiqueta: number) => {
    if (!hdv) return;
    removerEtiquetaMutation.mutate(
      { idHojaDeVida: hdv.id_hoja_de_vida, idEtiqueta },
      { onError: (e: any) => toast.error(`Error: ${e.message}`) }
    );
  };

  const ultimaRevision = hdv?.ultima_revision;
  const UltimaRevisionIcon = ultimaRevision
    ? revisionIcons[ultimaRevision.estado_revision as keyof typeof revisionIcons] ?? Clock
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card/95 backdrop-blur-2xl border-border/50">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-xl font-bold tracking-tight">
              Hoja de Vida — {nombreUsuario}
            </DialogTitle>
            {ultimaRevision && UltimaRevisionIcon && (
              <Badge className={`text-[10px] flex items-center gap-1 ${revisionColors[ultimaRevision.estado_revision as keyof typeof revisionColors] ?? ''}`}>
                <UltimaRevisionIcon className="w-3 h-3" />
                {ultimaRevision.estado_revision}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="perfil" className="mt-4">
          <TabsList className="rounded-xl bg-accent/40">
            <TabsTrigger value="perfil" className="rounded-lg text-xs">Perfil</TabsTrigger>
            {puedeRevisar && (
              <>
                <TabsTrigger value="revision" className="rounded-lg text-xs">Revisión</TabsTrigger>
                <TabsTrigger value="etiquetas" className="rounded-lg text-xs">Etiquetas</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="perfil" className="mt-4">
            <HojaDeVidaView hoja={hdv as any} loading={isLoading} puedeEditar={false} />
          </TabsContent>

          {puedeRevisar && (
            <TabsContent value="revision" className="mt-4 space-y-4">
              <div className="text-sm text-muted-foreground">
                Registra tu revisión del perfil de {nombreUsuario}.
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                  Estado
                </label>
                <Select value={estadoRevision} onValueChange={v => setEstadoRevision(v as any)}>
                  <SelectTrigger className="h-10 bg-background/50 border-white/10 rounded-xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aprobada">Aprobada</SelectItem>
                    <SelectItem value="observada">Observada (hay correcciones)</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                  Observaciones
                </label>
                <Textarea
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  placeholder="Escribe tus comentarios o correcciones..."
                  className="min-h-[100px] bg-background/50 border-white/10 rounded-xl text-sm resize-none"
                />
              </div>
              {ultimaRevision && (
                <div className="p-3 rounded-xl bg-accent/40 text-xs text-muted-foreground">
                  Última revisión:{' '}
                  <strong>{ultimaRevision.estado_revision}</strong>{' '}
                  el {new Date(ultimaRevision.revisado_en).toLocaleDateString('es-CO')}
                </div>
              )}
              <Button
                className="rounded-xl"
                onClick={handleRevision}
                disabled={crearRevisionMutation.isPending}
              >
                {crearRevisionMutation.isPending ? 'Guardando...' : 'Guardar Revisión'}
              </Button>
            </TabsContent>
          )}

          {puedeRevisar && (
            <TabsContent value="etiquetas" className="mt-4 space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Etiquetas asignadas
                </p>
                <div className="flex flex-wrap gap-2">
                  {etiquetasAsignadas.length === 0 && (
                    <span className="text-xs text-muted-foreground">Sin etiquetas</span>
                  )}
                  {etiquetasAsignadas.map(e => (
                    <Badge
                      key={e.id_etiqueta}
                      variant="secondary"
                      className="text-xs gap-1 pr-1 cursor-pointer"
                    >
                      {e.nombre}
                      <button
                        className="hover:text-red-500 transition-colors"
                        onClick={() => handleRemoverEtiqueta(e.id_etiqueta)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Agregar etiqueta
                </p>
                <div className="flex flex-wrap gap-2">
                  {etiquetasDisponibles.map(e => (
                    <button
                      key={e.id_etiqueta}
                      onClick={() => handleAsignarEtiqueta(e.id_etiqueta)}
                      className="px-2.5 py-1 rounded-full text-xs border border-border/40 bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {e.nombre}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Update callers that use `HojaDeVidaModal` to pass `puedeRevisar`**

In `src/app/components/UsuariosPage.tsx`, find the `HojaDeVidaModal` usage and add the `puedeRevisar` prop:

```typescript
// Before (existing):
<HojaDeVidaModal idUsuario={...} isOpen={...} onClose={...} nombreUsuario={...} />

// After:
<HojaDeVidaModal
  idUsuario={...}
  isOpen={...}
  onClose={...}
  nombreUsuario={...}
  puedeRevisar={rolActual === 'super_admin' || rolActual === 'admin_iglesia' || rolActual === 'admin_sede' || rolActual === 'lider'}
/>
```

To find the exact location in UsuariosPage.tsx, grep for `HojaDeVidaModal`:
```bash
grep -n "HojaDeVidaModal" src/app/components/UsuariosPage.tsx
```

- [ ] **Step 3: Verify build passes**

```bash
node_modules/.bin/vite build 2>&1 | tail -5
```
Expected: `✓ built in`

- [ ] **Step 4: Commit**

```bash
git add src/app/components/hojaDeVida/HojaDeVidaModal.tsx src/app/components/UsuariosPage.tsx
git commit -m "feat(ui): add RevisionPanel and EtiquetasPanel to HojaDeVidaModal for admin/leader roles"
```
