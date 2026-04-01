# Supabase Backend Integration (Phases 0–2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect IGLESIABD SPA to its live Supabase backend — replacing all mock data with real reads, adding Auth via email+password, correcting RLS for 19 tables, seeding Colombia data, and establishing a typed services/hooks layer.

**Architecture:** Shared Services Layer — `src/services/` holds pure Supabase calls + snake_case→camelCase mappers; `src/hooks/` wraps them with TanStack Query; components consume hooks only. AppContext is stripped to session + UI state (~80 lines from ~6k).

**Tech Stack:** @supabase/supabase-js v2, @tanstack/react-query v5, React 18 + Vite + TypeScript, Supabase project `heibyjbvfiokmduwwawm`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `.env` | Supabase URL + anon key |
| Create | `src/lib/supabaseClient.ts` | Singleton typed Supabase client |
| Create | `src/types/database.types.ts` | Auto-generated DB types (snake_case) |
| Create | `src/types/app.types.ts` | camelCase frontend interfaces (number IDs) |
| Create | `src/services/geografia.service.ts` | pais, departamento_geo, ciudad queries |
| Create | `src/services/iglesias.service.ts` | iglesia, pastor, iglesia_pastor, sede queries |
| Create | `src/services/ministerios.service.ts` | ministerio, miembro_ministerio queries |
| Create | `src/services/usuarios.service.ts` | usuario, rol, usuario_rol queries |
| Create | `src/services/eventos.service.ts` | tipo_evento, evento, tarea, tarea_asignada queries |
| Create | `src/services/cursos.service.ts` | curso, modulo, recurso, evaluacion, proceso queries |
| Create | `src/services/notificaciones.service.ts` | notificacion queries |
| Create | `src/hooks/useGeografia.ts` | usePaises, useDepartamentos, useCiudades |
| Create | `src/hooks/useIglesias.ts` | useIglesias, usePastores, useIglesiaPastores, useSedes |
| Create | `src/hooks/useMinisterios.ts` | useMinisterios, useMiembrosMinisterio |
| Create | `src/hooks/useUsuarios.ts` | useRoles, useUsuarios, useUsuarioRoles |
| Create | `src/hooks/useEventos.ts` | useTiposEvento, useEventos, useTareas, useTareasAsignadas |
| Create | `src/hooks/useCursos.ts` | useCursos, useModulos, useRecursos, useEvaluaciones, useProcesos |
| Create | `src/hooks/useNotificaciones.ts` | useNotificaciones |
| Modify | `src/main.tsx` | Wrap App with QueryClientProvider |
| Modify | `src/app/store/AppContext.tsx` | Strip to session + UI state; add onAuthStateChange |
| Modify | `src/app/components/LoginPage.tsx` | Use supabase.auth.signInWithPassword |
| Modify | `src/app/components/GeographyPage.tsx` | useGeografia hooks |
| Modify | `src/app/components/ChurchesPage.tsx` | useIglesias hooks |
| Modify | `src/app/components/SedesPage.tsx` | useSedes hook |
| Modify | `src/app/components/PastoresPage.tsx` | usePastores hook |
| Modify | `src/app/components/DepartmentsPage.tsx` | useMinisterios hook |
| Modify | `src/app/components/MyDepartmentPage.tsx` | useMinisterios hook |
| Modify | `src/app/components/MembersPage.tsx` | useMiembrosMinisterio hook |
| Modify | `src/app/components/UsuariosPage.tsx` | useUsuarios + useRoles hooks |
| Modify | `src/app/components/CatalogosPage.tsx` | useRoles + useTiposEvento hooks |
| Modify | `src/app/components/EventsPage.tsx` | useEventos hook |
| Modify | `src/app/components/TasksPage.tsx` | useTareas hook |
| Modify | `src/app/components/ClassroomPage.tsx` | useCursos hook |
| Modify | `src/app/components/EvaluationsPage.tsx` | useEvaluaciones hook |
| Modify | `src/app/components/CiclosLectivosPage.tsx` | useProcesosAsignadoCurso hook |
| Modify | `src/app/components/NotificationsPage.tsx` | useNotificaciones hook |
| Modify | `src/app/components/DashboardPage.tsx` | useIglesias + useEventos + notificacionesCount |
| Modify | `src/app/components/ProfilePage.tsx` | usuarioActual from AppContext |

---

## Task 1: Install dependencies, create .env

**Files:** `package.json`, `.env`, `.gitignore`

- [ ] **Step 1: Install packages**

```bash
cd /home/juanda/Proyectofinal
npm install @supabase/supabase-js @tanstack/react-query @tanstack/react-query-devtools
```

Expected: installs without peer-dependency errors.

- [ ] **Step 2: Create .env**

Create `/home/juanda/Proyectofinal/.env` with this exact content:

```
VITE_SUPABASE_URL=https://heibyjbvfiokmduwwawm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlaWJ5amJ2Zmlva21kdXd3YXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MDAzNjEsImV4cCI6MjA4OTA3NjM2MX0.dCwu7xz1hExRFX1brCGDZySW0aacxBaV-yjPt0bqVZI
```

- [ ] **Step 3: Ensure .env is in .gitignore**

Read `.gitignore`. If `.env` is not already listed, add it on its own line.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "feat: install @supabase/supabase-js and @tanstack/react-query"
```

---

## Task 2: Generate database.types.ts + create supabaseClient.ts

**Files:** `src/types/database.types.ts`, `src/lib/supabaseClient.ts`

- [ ] **Step 1: Generate TypeScript types from Supabase**

Use MCP tool `mcp__plugin_supabase_supabase__generate_typescript_types` with `project_id: "heibyjbvfiokmduwwawm"`.

Save the complete output to `src/types/database.types.ts`.

- [ ] **Step 2: Create src/lib/supabaseClient.ts**

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in the two new files.

- [ ] **Step 4: Commit**

```bash
git add src/types/database.types.ts src/lib/supabaseClient.ts
git commit -m "feat: add typed Supabase client and generated database types"
```

---

## Task 3: Create src/types/app.types.ts

**Files:** `src/types/app.types.ts`

Key change from AppContext: all `id*` fields are `number` (not `string`). `Usuario` gains `authUserId`. `SessionUser` updated accordingly.

- [ ] **Step 1: Create src/types/app.types.ts**

```typescript
// ── Geografía ──
export interface Pais {
  idPais: number
  nombre: string
  creadoEn: string
  actualizadoEn: string
}

export interface DepartamentoGeo {
  idDepartamentoGeo: number
  nombre: string
  idPais: number
  creadoEn: string
  actualizadoEn: string
}

export interface Ciudad {
  idCiudad: number
  nombre: string
  idDepartamentoGeo: number
  creadoEn: string
  actualizadoEn: string
}

// ── Iglesia & Sedes ──
export interface Iglesia {
  idIglesia: number
  nombre: string
  fechaFundacion: string | null
  estado: 'activa' | 'inactiva' | 'fusionada' | 'cerrada'
  idCiudad: number
  creadoEn: string
  actualizadoEn: string
  ciudadNombre?: string
  departamentoGeoNombre?: string
  paisNombre?: string
}

export interface Pastor {
  idPastor: number
  nombres: string
  apellidos: string
  correo: string
  telefono: string | null
  idUsuario: number | null
  creadoEn: string
  actualizadoEn: string
}

export interface IglesiaPastor {
  idIglesiaPastor: number
  idIglesia: number
  idPastor: number
  esPrincipal: boolean
  fechaInicio: string
  fechaFin: string | null
  observaciones: string | null
  creadoEn: string
  actualizadoEn: string
}

export interface Sede {
  idSede: number
  nombre: string
  direccion: string | null
  idCiudad: number
  idIglesia: number
  estado: 'activa' | 'inactiva' | 'en_construccion'
  creadoEn: string
  actualizadoEn: string
}

// ── Ministerios ──
export interface Ministerio {
  idMinisterio: number
  nombre: string
  descripcion: string | null
  estado: 'activo' | 'inactivo' | 'suspendido'
  idSede: number
  creadoEn: string
  actualizadoEn: string
  idIglesia?: number
  liderNombre?: string
  cantidadMiembros?: number
}

export interface MiembroMinisterio {
  idMiembroMinisterio: number
  idUsuario: number
  idMinisterio: number
  rolEnMinisterio: string | null
  fechaIngreso: string
  fechaSalida: string | null
  creadoEn: string
  actualizadoEn: string
  nombreCompleto?: string
  correo?: string
  telefono?: string
  activo?: boolean
}

// ── Usuarios & Roles ──
export interface Rol {
  idRol: number
  nombre: string
  descripcion: string | null
  creadoEn: string
  actualizadoEn: string
}

export interface Usuario {
  idUsuario: number
  nombres: string
  apellidos: string
  correo: string
  contrasenaHash: string
  telefono: string | null
  activo: boolean
  ultimoAcceso: string | null
  authUserId: string | null
  creadoEn: string
  actualizadoEn: string
}

export interface UsuarioRol {
  idUsuarioRol: number
  idUsuario: number
  idRol: number
  idIglesia: number
  idSede: number | null
  fechaInicio: string
  fechaFin: string | null
  creadoEn: string
  actualizadoEn: string
}

// ── Notificaciones ──
export interface Notificacion {
  idNotificacion: number
  idUsuario: number
  titulo: string
  mensaje: string
  leida: boolean
  fechaLectura: string | null
  tipo: 'informacion' | 'alerta' | 'tarea' | 'evento' | 'curso'
  creadoEn: string
  actualizadoEn: string
}

// ── Eventos & Tareas ──
export interface TipoEvento {
  idTipoEvento: number
  nombre: string
  descripcion: string | null
  creadoEn: string
  actualizadoEn: string
}

export interface Evento {
  idEvento: number
  nombre: string
  descripcion: string | null
  idTipoEvento: number
  fechaInicio: string
  fechaFin: string
  estado: 'programado' | 'en_curso' | 'finalizado' | 'cancelado'
  idIglesia: number
  idSede: number | null
  idMinisterio: number | null
  creadoEn: string
  actualizadoEn: string
  tipoEventoNombre?: string
  ministerioNombre?: string
  sedeNombre?: string
}

export interface Tarea {
  idTarea: number
  titulo: string
  descripcion: string | null
  fechaLimite: string | null
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada'
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  idEvento: number | null
  idUsuarioCreador: number
  creadoEn: string
  actualizadoEn: string
  idMinisterio?: number
  asignados?: TareaAsignada[]
}

export interface TareaAsignada {
  idTareaAsignada: number
  idTarea: number
  idUsuario: number
  fechaAsignacion: string
  fechaCompletado: string | null
  observaciones: string | null
  creadoEn: string
  actualizadoEn: string
  nombreCompleto?: string
}

// ── Cursos & Formación ──
export interface Curso {
  idCurso: number
  nombre: string
  descripcion: string | null
  duracionHoras: number | null
  estado: 'borrador' | 'activo' | 'inactivo' | 'archivado'
  idMinisterio: number
  idUsuarioCreador: number
  creadoEn: string
  actualizadoEn: string
  modulos?: Modulo[]
}

export interface Modulo {
  idModulo: number
  titulo: string
  descripcion: string | null
  orden: number
  estado: 'borrador' | 'publicado' | 'archivado'
  idCurso: number
  creadoEn: string
  actualizadoEn: string
  recursos?: Recurso[]
}

export interface Recurso {
  idRecurso: number
  idModulo: number
  nombre: string
  tipo: 'archivo' | 'enlace'
  url: string
}

export interface Evaluacion {
  idEvaluacion: number
  idModulo: number
  idUsuario: number
  calificacion: number | null
  estado: 'pendiente' | 'aprobado' | 'reprobado' | 'en_revision'
  observaciones: string | null
  fechaEvaluacion: string | null
  creadoEn: string
  actualizadoEn: string
  nombreUsuario?: string
  tituloModulo?: string
  nombreCurso?: string
  idMinisterio?: number
}

export interface ProcesoAsignadoCurso {
  idProcesoAsignadoCurso: number
  idCurso: number
  idIglesia: number
  fechaInicio: string
  fechaFin: string
  estado: 'programado' | 'en_curso' | 'finalizado' | 'cancelado'
  creadoEn: string
  actualizadoEn: string
}

export interface DetalleProcesoCurso {
  idDetalleProcesoCurso: number
  idProcesoAsignadoCurso: number
  idUsuario: number
  fechaInscripcion: string
  estado: 'inscrito' | 'en_progreso' | 'completado' | 'retirado'
  creadoEn: string
  actualizadoEn: string
  nombreCompleto?: string
  correo?: string
}

// ── Session ──
export type RolClave = 'super_admin' | 'admin_iglesia' | 'lider' | 'servidor'

export interface SessionUser {
  idUsuario: number
  nombres: string
  apellidos: string
  correo: string
  telefono: string | null
  activo: boolean
  rol: RolClave
  iglesiasIds: number[]
  idIglesiaActiva: number
  idMinisterio?: number
  idMiembroMinisterio?: number
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors in app.types.ts itself.

- [ ] **Step 3: Commit**

```bash
git add src/types/app.types.ts
git commit -m "feat: add app.types.ts with camelCase interfaces (number IDs)"
```

---

## Task 4: Migration — auth_user_id + handle_new_user trigger

**Files:** Supabase DB (via MCP)

- [ ] **Step 1: Apply migration**

Use MCP tool `mcp__plugin_supabase_supabase__apply_migration`:
- `project_id`: `"heibyjbvfiokmduwwawm"`
- `name`: `"20260331_auth_user_id_and_trigger"`
- `query`:

```sql
-- Add auth_user_id column to usuario
ALTER TABLE public.usuario
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_auth_user_id
  ON public.usuario(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Trigger: auto-create public.usuario row when auth.users gets a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuario (auth_user_id, nombres, apellidos, correo, contrasena_hash)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombres', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellidos', ''),
    NEW.email,
    ''
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

- [ ] **Step 2: Verify column was added**

Use MCP tool `mcp__plugin_supabase_supabase__execute_sql`:
- `project_id`: `"heibyjbvfiokmduwwawm"`
- `query`:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'usuario' AND column_name = 'auth_user_id';
```

Expected: 1 row — `auth_user_id`, `uuid`.

- [ ] **Step 3: Regenerate database.types.ts**

Re-run MCP `mcp__plugin_supabase_supabase__generate_typescript_types` with `project_id: "heibyjbvfiokmduwwawm"` and overwrite `src/types/database.types.ts` with the new output (the `usuario` Row now includes `auth_user_id`).

- [ ] **Step 4: Commit**

```bash
git add src/types/database.types.ts
git commit -m "chore: apply migration auth_user_id + handle_new_user trigger; regen types"
```

---

## Task 5: Migration — RLS authenticated read policies

**Files:** Supabase DB (via MCP)

Currently only 5 tables have authenticated SELECT policies. This migration adds policies for the remaining 19 tables.

- [ ] **Step 1: Apply migration**

Use MCP tool `mcp__plugin_supabase_supabase__apply_migration`:
- `project_id`: `"heibyjbvfiokmduwwawm"`
- `name`: `"20260331_rls_authenticated_reads"`
- `query`:

```sql
-- Catalog tables: all authenticated users can read
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'iglesia', 'sede', 'pastor', 'ministerio',
    'evento', 'tarea', 'curso', 'modulo', 'recurso',
    'iglesia_pastor', 'sede_pastor',
    'miembro_ministerio', 'proceso_asignado_curso',
    'detalle_proceso_curso'
  ]
  LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY "Lectura autenticada" ON public.%I FOR SELECT TO authenticated USING (true)',
        tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- usuario: each user sees only their own profile
DO $$ BEGIN
  CREATE POLICY "Usuario ve su propio perfil"
  ON public.usuario FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- usuario_rol: user sees their own role assignments
DO $$ BEGIN
  CREATE POLICY "Usuario ve sus roles"
  ON public.usuario_rol FOR SELECT
  TO authenticated
  USING (
    id_usuario = (
      SELECT id_usuario FROM public.usuario
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- notificacion: user sees only their own
DO $$ BEGIN
  CREATE POLICY "Usuario ve sus notificaciones"
  ON public.notificacion FOR SELECT
  TO authenticated
  USING (
    id_usuario = (
      SELECT id_usuario FROM public.usuario
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- tarea_asignada: user sees their own assignments
DO $$ BEGIN
  CREATE POLICY "Usuario ve sus tareas asignadas"
  ON public.tarea_asignada FOR SELECT
  TO authenticated
  USING (
    id_usuario = (
      SELECT id_usuario FROM public.usuario
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- evaluacion: user sees their own evaluations
DO $$ BEGIN
  CREATE POLICY "Usuario ve sus evaluaciones"
  ON public.evaluacion FOR SELECT
  TO authenticated
  USING (
    id_usuario = (
      SELECT id_usuario FROM public.usuario
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

- [ ] **Step 2: Verify policies exist**

Use MCP `mcp__plugin_supabase_supabase__execute_sql`:
- `project_id`: `"heibyjbvfiokmduwwawm"`
- `query`:

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND roles::text LIKE '%authenticated%'
ORDER BY tablename;
```

Expected: 20+ rows covering all tables above.

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "chore: apply migration 20260331_rls_authenticated_reads"
```

---

## Task 6: Migration — FK indexes

**Files:** Supabase DB (via MCP)

- [ ] **Step 1: Apply migration**

Use MCP tool `mcp__plugin_supabase_supabase__apply_migration`:
- `project_id`: `"heibyjbvfiokmduwwawm"`
- `name`: `"20260331_fk_indexes"`
- `query`:

```sql
CREATE INDEX IF NOT EXISTS idx_sede_id_iglesia ON public.sede(id_iglesia);
CREATE INDEX IF NOT EXISTS idx_ministerio_id_sede ON public.ministerio(id_sede);
CREATE INDEX IF NOT EXISTS idx_evento_id_iglesia ON public.evento(id_iglesia);
CREATE INDEX IF NOT EXISTS idx_tarea_id_evento ON public.tarea(id_evento);
CREATE INDEX IF NOT EXISTS idx_notificacion_id_usuario ON public.notificacion(id_usuario);
CREATE INDEX IF NOT EXISTS idx_tarea_asignada_id_usuario ON public.tarea_asignada(id_usuario);
CREATE INDEX IF NOT EXISTS idx_evaluacion_id_usuario ON public.evaluacion(id_usuario);
CREATE INDEX IF NOT EXISTS idx_usuario_rol_id_usuario ON public.usuario_rol(id_usuario);
```

- [ ] **Step 2: Commit**

```bash
git commit --allow-empty -m "chore: apply migration 20260331_fk_indexes"
```

---

## Task 7: Migration — Seed data

**Files:** Supabase DB (via MCP)

- [ ] **Step 1: Apply migration**

Use MCP tool `mcp__plugin_supabase_supabase__apply_migration`:
- `project_id`: `"heibyjbvfiokmduwwawm"`
- `name`: `"20260331_seed_data"`
- `query`:

```sql
-- ── Geografía: Colombia ──
INSERT INTO public.pais (nombre) VALUES ('Colombia')
ON CONFLICT DO NOTHING;

WITH col AS (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
INSERT INTO public.departamento_geo (nombre, id_pais)
SELECT d.nombre, col.id_pais FROM col, (VALUES
  ('Cundinamarca'), ('Antioquia'), ('Valle del Cauca'),
  ('Atlántico'), ('Santander'), ('Bolívar')
) AS d(nombre)
ON CONFLICT DO NOTHING;

INSERT INTO public.ciudad (nombre, id_departamento_geo)
SELECT c.nombre, dg.id_departamento_geo
FROM (VALUES
  ('Bogotá',        'Cundinamarca'),
  ('Soacha',        'Cundinamarca'),
  ('Medellín',      'Antioquia'),
  ('Bello',         'Antioquia'),
  ('Cali',          'Valle del Cauca'),
  ('Palmira',       'Valle del Cauca'),
  ('Barranquilla',  'Atlántico'),
  ('Soledad',       'Atlántico'),
  ('Bucaramanga',   'Santander'),
  ('Floridablanca', 'Santander'),
  ('Cartagena',     'Bolívar'),
  ('Turbaco',       'Bolívar')
) AS c(nombre, depto)
JOIN public.departamento_geo dg ON dg.nombre = c.depto
ON CONFLICT DO NOTHING;

-- ── Roles ──
INSERT INTO public.rol (nombre, descripcion) VALUES
  ('Super Administrador',     'Gestión global de iglesias en la plataforma'),
  ('Administrador de Iglesia','Gestión de ministerios, miembros y eventos'),
  ('Líder',                   'Gestión completa de su ministerio'),
  ('Servidor',                'Lectura general y actualización de sus tareas')
ON CONFLICT DO NOTHING;

-- ── Tipos de evento ──
INSERT INTO public.tipo_evento (nombre, descripcion) VALUES
  ('Culto dominical',      'Servicio principal de adoración'),
  ('Conferencia',          'Evento de formación y enseñanza'),
  ('Retiro espiritual',    'Encuentro de crecimiento espiritual'),
  ('Evangelismo',          'Actividad de alcance comunitario'),
  ('Reunión de líderes',   'Reunión de coordinación de líderes'),
  ('Actividad de ministerio', 'Actividad específica de un ministerio')
ON CONFLICT DO NOTHING;

-- ── Demo: Iglesia ──
INSERT INTO public.iglesia (nombre, fecha_fundacion, estado, id_ciudad)
SELECT 'Iglesia Central', '2010-01-15', 'activa', c.id_ciudad
FROM public.ciudad c
JOIN public.departamento_geo dg ON dg.id_departamento_geo = c.id_departamento_geo
WHERE c.nombre = 'Bogotá' AND dg.nombre = 'Cundinamarca'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ── Demo: Sede ──
INSERT INTO public.sede (nombre, direccion, id_ciudad, id_iglesia, estado)
SELECT 'Sede Principal', 'Calle 100 #15-20, Bogotá', c.id_ciudad, ig.id_iglesia, 'activa'
FROM public.ciudad c
JOIN public.departamento_geo dg ON dg.id_departamento_geo = c.id_departamento_geo,
     public.iglesia ig
WHERE c.nombre = 'Bogotá' AND dg.nombre = 'Cundinamarca'
  AND ig.nombre = 'Iglesia Central'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ── Demo: Ministerio ──
INSERT INTO public.ministerio (nombre, descripcion, estado, id_sede)
SELECT 'Ministerio de Jóvenes', 'Ministerio para jóvenes de 15 a 30 años', 'activo', s.id_sede
FROM public.sede s WHERE s.nombre = 'Sede Principal'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ── Demo: Evento (próximo domingo) ──
INSERT INTO public.evento (
  nombre, descripcion, id_tipo_evento,
  fecha_inicio, fecha_fin, estado, id_iglesia, id_sede
)
SELECT
  'Culto Dominical',
  'Servicio principal de adoración dominical',
  te.id_tipo_evento,
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '7 days' + INTERVAL '2 hours',
  'programado',
  ig.id_iglesia,
  s.id_sede
FROM public.tipo_evento te, public.iglesia ig, public.sede s
WHERE te.nombre = 'Culto dominical'
  AND ig.nombre = 'Iglesia Central'
  AND s.nombre = 'Sede Principal'
ON CONFLICT DO NOTHING;

-- ── Demo: Curso ──
-- Note: requires at least one row in public.usuario; will be skipped if tabla vacía
-- Run this after creating the admin auth user (see Task 23 post-plan step)
```

- [ ] **Step 2: Verify seed counts**

Use MCP `mcp__plugin_supabase_supabase__execute_sql`:
- `project_id`: `"heibyjbvfiokmduwwawm"`
- `query`:

```sql
SELECT
  (SELECT COUNT(*) FROM public.pais)             AS paises,
  (SELECT COUNT(*) FROM public.departamento_geo) AS departamentos,
  (SELECT COUNT(*) FROM public.ciudad)           AS ciudades,
  (SELECT COUNT(*) FROM public.rol)              AS roles,
  (SELECT COUNT(*) FROM public.tipo_evento)      AS tipos_evento,
  (SELECT COUNT(*) FROM public.iglesia)          AS iglesias,
  (SELECT COUNT(*) FROM public.sede)             AS sedes,
  (SELECT COUNT(*) FROM public.ministerio)       AS ministerios,
  (SELECT COUNT(*) FROM public.evento)           AS eventos;
```

Expected: `1, 6, 12, 4, 6, 1, 1, 1, 1`.

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "chore: apply migration 20260331_seed_data"
```

---

## Task 8: Update main.tsx with QueryClientProvider

**Files:** `src/main.tsx`

- [ ] **Step 1: Replace src/main.tsx**

```typescript
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './app/App.tsx'
import './styles/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
)
```

- [ ] **Step 2: Verify app starts**

```bash
npm run dev
```

Open http://localhost:5173. Expected: app loads, React Query Devtools button appears in bottom-right corner.

- [ ] **Step 3: Commit**

```bash
git add src/main.tsx
git commit -m "feat: add QueryClientProvider in main.tsx"
```

---

## Task 9: Reduce AppContext + update LoginPage

**Files:** `src/app/store/AppContext.tsx`, `src/app/components/LoginPage.tsx`

This is the largest change. AppContext goes from ~6k lines to ~90 lines. TypeScript errors will appear throughout the codebase — they get fixed in Tasks 17–23 as each domain is migrated.

- [ ] **Step 1: Replace src/app/store/AppContext.tsx entirely**

```typescript
import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { Usuario } from '@/types/app.types'

interface AppState {
  session: Session | null
  usuarioActual: Usuario | null
  isAuthenticated: boolean
  sidebarOpen: boolean
  notificacionesCount: number
  darkMode: boolean
  toggleSidebar: () => void
  toggleDarkMode: () => void
  logout: () => Promise<void>
}

const AppContext = createContext<AppState | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notificacionesCount, setNotificacionesCount] = useState(0)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sei-dark-mode') === 'true'
    }
    return false
  })

  useEffect(() => {
    const root = document.documentElement
    if (darkMode) root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('sei-dark-mode', String(darkMode))
  }, [darkMode])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session) {
        const { data } = await supabase
          .from('usuario')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .single()
        if (data) {
          setUsuarioActual({
            idUsuario: data.id_usuario,
            nombres: data.nombres,
            apellidos: data.apellidos,
            correo: data.correo,
            contrasenaHash: data.contrasena_hash,
            telefono: data.telefono,
            activo: data.activo,
            ultimoAcceso: data.ultimo_acceso,
            authUserId: data.auth_user_id ?? null,
            creadoEn: data.creado_en,
            actualizadoEn: data.updated_at,
          })
          const { count } = await supabase
            .from('notificacion')
            .select('*', { count: 'exact', head: true })
            .eq('id_usuario', data.id_usuario)
            .eq('leida', false)
          setNotificacionesCount(count ?? 0)
        }
      } else {
        setUsuarioActual(null)
        setNotificacionesCount(0)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AppContext.Provider
      value={{
        session,
        usuarioActual,
        isAuthenticated: !!session,
        sidebarOpen,
        notificacionesCount,
        darkMode,
        toggleSidebar: () => setSidebarOpen((p) => !p),
        toggleDarkMode: () => setDarkMode((p) => !p),
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
```

- [ ] **Step 2: Replace login logic in src/app/components/LoginPage.tsx**

Replace the import section and all handler functions (lines 1–60) with:

```typescript
import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '@/lib/supabaseClient'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card } from './ui/card'
import { motion } from 'motion/react'
import { SEILogo } from './SEILogo'
import {
  Church, Eye, EyeOff, LogIn, Shield, Building2, Crown,
  User, ChevronRight, Sparkles,
} from 'lucide-react'

const testCredentials = [
  { email: 'admin@iglesiabd.com', label: 'Admin', desc: 'Gestión global', icon: Shield, color: 'from-red-500 to-orange-500' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Por favor completa todos los campos.')
      return
    }
    setIsLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Credenciales incorrectas.')
      setIsLoading(false)
    } else {
      navigate('/app')
    }
  }

  const handleQuickLogin = async (credEmail: string) => {
    setEmail(credEmail)
    setError('')
    setIsLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: credEmail,
      password: 'Password123!',
    })
    if (authError) {
      setError('Cuenta demo no encontrada. Créala en Supabase Dashboard > Auth > Users.')
      setIsLoading(false)
    } else {
      navigate('/app')
    }
  }
```

Keep the JSX return block (`return ( <div className="min-h-screen ..."> ... </div> )`) identical to the original.

- [ ] **Step 3: Check TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

Expected: many errors (all the components that reference removed AppContext properties). These are expected and will be fixed in Tasks 17–23. The count gives a baseline.

- [ ] **Step 4: Commit**

```bash
git add src/app/store/AppContext.tsx src/app/components/LoginPage.tsx
git commit -m "feat: reduce AppContext to auth+UI state; LoginPage uses Supabase Auth"
```

---

## Task 10: Service + Hook — Geography

**Files:** `src/services/geografia.service.ts`, `src/hooks/useGeografia.ts`

- [ ] **Step 1: Create src/services/geografia.service.ts**

```typescript
import { supabase } from '@/lib/supabaseClient'
import type { Pais, DepartamentoGeo, Ciudad } from '@/types/app.types'
import type { Database } from '@/types/database.types'

type PaisRow = Database['public']['Tables']['pais']['Row']
type DeptoRow = Database['public']['Tables']['departamento_geo']['Row']
type CiudadRow = Database['public']['Tables']['ciudad']['Row']

function mapPais(r: PaisRow): Pais {
  return {
    idPais: r.id_pais,
    nombre: r.nombre,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapDepto(r: DeptoRow): DepartamentoGeo {
  return {
    idDepartamentoGeo: r.id_departamento_geo,
    nombre: r.nombre,
    idPais: r.id_pais,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapCiudad(r: CiudadRow): Ciudad {
  return {
    idCiudad: r.id_ciudad,
    nombre: r.nombre,
    idDepartamentoGeo: r.id_departamento_geo,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

export async function getPaises(): Promise<Pais[]> {
  const { data, error } = await supabase.from('pais').select('*').order('nombre')
  if (error) throw error
  return data.map(mapPais)
}

export async function getDepartamentos(idPais?: number): Promise<DepartamentoGeo[]> {
  let q = supabase.from('departamento_geo').select('*').order('nombre')
  if (idPais) q = q.eq('id_pais', idPais)
  const { data, error } = await q
  if (error) throw error
  return data.map(mapDepto)
}

export async function getCiudades(idDepartamento?: number): Promise<Ciudad[]> {
  let q = supabase.from('ciudad').select('*').order('nombre')
  if (idDepartamento) q = q.eq('id_departamento_geo', idDepartamento)
  const { data, error } = await q
  if (error) throw error
  return data.map(mapCiudad)
}
```

- [ ] **Step 2: Create src/hooks/useGeografia.ts**

```typescript
import { useQuery } from '@tanstack/react-query'
import { getPaises, getDepartamentos, getCiudades } from '@/services/geografia.service'

export function usePaises() {
  return useQuery({
    queryKey: ['paises'],
    queryFn: getPaises,
    staleTime: 30 * 60 * 1000,
  })
}

export function useDepartamentos(idPais?: number) {
  return useQuery({
    queryKey: ['departamentos', idPais],
    queryFn: () => getDepartamentos(idPais),
    staleTime: 30 * 60 * 1000,
  })
}

export function useCiudades(idDepartamento?: number) {
  return useQuery({
    queryKey: ['ciudades', idDepartamento],
    queryFn: () => getCiudades(idDepartamento),
    staleTime: 30 * 60 * 1000,
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/geografia.service.ts src/hooks/useGeografia.ts
git commit -m "feat: add geografia service and hooks"
```

---

## Task 11: Service + Hook — Iglesias

**Files:** `src/services/iglesias.service.ts`, `src/hooks/useIglesias.ts`

- [ ] **Step 1: Create src/services/iglesias.service.ts**

```typescript
import { supabase } from '@/lib/supabaseClient'
import type { Iglesia, Pastor, IglesiaPastor, Sede } from '@/types/app.types'
import type { Database } from '@/types/database.types'

type IglesiaRow = Database['public']['Tables']['iglesia']['Row']
type PastorRow = Database['public']['Tables']['pastor']['Row']
type IglesiaPastorRow = Database['public']['Tables']['iglesia_pastor']['Row']
type SedeRow = Database['public']['Tables']['sede']['Row']

function mapIglesia(r: IglesiaRow): Iglesia {
  return {
    idIglesia: r.id_iglesia,
    nombre: r.nombre,
    fechaFundacion: r.fecha_fundacion,
    estado: r.estado as Iglesia['estado'],
    idCiudad: r.id_ciudad,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapPastor(r: PastorRow): Pastor {
  return {
    idPastor: r.id_pastor,
    nombres: r.nombres,
    apellidos: r.apellidos,
    correo: r.correo,
    telefono: r.telefono,
    idUsuario: r.id_usuario,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapIglesiaPastor(r: IglesiaPastorRow): IglesiaPastor {
  return {
    idIglesiaPastor: r.id_iglesia_pastor,
    idIglesia: r.id_iglesia,
    idPastor: r.id_pastor,
    esPrincipal: r.es_principal,
    fechaInicio: r.fecha_inicio,
    fechaFin: r.fecha_fin,
    observaciones: r.observaciones,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapSede(r: SedeRow): Sede {
  return {
    idSede: r.id_sede,
    nombre: r.nombre,
    direccion: r.direccion,
    idCiudad: r.id_ciudad,
    idIglesia: r.id_iglesia,
    estado: r.estado as Sede['estado'],
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

export async function getIglesias(): Promise<Iglesia[]> {
  const { data, error } = await supabase.from('iglesia').select('*').order('nombre')
  if (error) throw error
  return data.map(mapIglesia)
}

export async function getPastores(): Promise<Pastor[]> {
  const { data, error } = await supabase.from('pastor').select('*').order('apellidos')
  if (error) throw error
  return data.map(mapPastor)
}

export async function getIglesiaPastores(): Promise<IglesiaPastor[]> {
  const { data, error } = await supabase.from('iglesia_pastor').select('*')
  if (error) throw error
  return data.map(mapIglesiaPastor)
}

export async function getSedes(idIglesia?: number): Promise<Sede[]> {
  let q = supabase.from('sede').select('*').order('nombre')
  if (idIglesia) q = q.eq('id_iglesia', idIglesia)
  const { data, error } = await q
  if (error) throw error
  return data.map(mapSede)
}
```

- [ ] **Step 2: Create src/hooks/useIglesias.ts**

```typescript
import { useQuery } from '@tanstack/react-query'
import { getIglesias, getPastores, getIglesiaPastores, getSedes } from '@/services/iglesias.service'

export function useIglesias() {
  return useQuery({
    queryKey: ['iglesias'],
    queryFn: getIglesias,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePastores() {
  return useQuery({
    queryKey: ['pastores'],
    queryFn: getPastores,
    staleTime: 5 * 60 * 1000,
  })
}

export function useIglesiaPastores() {
  return useQuery({
    queryKey: ['iglesia-pastores'],
    queryFn: getIglesiaPastores,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSedes(idIglesia?: number) {
  return useQuery({
    queryKey: ['sedes', idIglesia],
    queryFn: () => getSedes(idIglesia),
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/iglesias.service.ts src/hooks/useIglesias.ts
git commit -m "feat: add iglesias service and hooks"
```

---

## Task 12: Service + Hook — Ministerios

**Files:** `src/services/ministerios.service.ts`, `src/hooks/useMinisterios.ts`

- [ ] **Step 1: Create src/services/ministerios.service.ts**

```typescript
import { supabase } from '@/lib/supabaseClient'
import type { Ministerio, MiembroMinisterio } from '@/types/app.types'
import type { Database } from '@/types/database.types'

type MinisterioRow = Database['public']['Tables']['ministerio']['Row']
type MiembroRow = Database['public']['Tables']['miembro_ministerio']['Row']

function mapMinisterio(r: MinisterioRow): Ministerio {
  return {
    idMinisterio: r.id_ministerio,
    nombre: r.nombre,
    descripcion: r.descripcion,
    estado: r.estado as Ministerio['estado'],
    idSede: r.id_sede,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapMiembro(r: MiembroRow): MiembroMinisterio {
  return {
    idMiembroMinisterio: r.id_miembro_ministerio,
    idUsuario: r.id_usuario,
    idMinisterio: r.id_ministerio,
    rolEnMinisterio: r.rol_en_ministerio,
    fechaIngreso: r.fecha_ingreso,
    fechaSalida: r.fecha_salida,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

export async function getMinisterios(idSede?: number): Promise<Ministerio[]> {
  let q = supabase.from('ministerio').select('*').order('nombre')
  if (idSede) q = q.eq('id_sede', idSede)
  const { data, error } = await q
  if (error) throw error
  return data.map(mapMinisterio)
}

export async function getMiembrosMinisterio(idMinisterio: number): Promise<MiembroMinisterio[]> {
  const { data, error } = await supabase
    .from('miembro_ministerio')
    .select('*')
    .eq('id_ministerio', idMinisterio)
    .is('fecha_salida', null)
  if (error) throw error
  return data.map(mapMiembro)
}
```

- [ ] **Step 2: Create src/hooks/useMinisterios.ts**

```typescript
import { useQuery } from '@tanstack/react-query'
import { getMinisterios, getMiembrosMinisterio } from '@/services/ministerios.service'

export function useMinisterios(idSede?: number) {
  return useQuery({
    queryKey: ['ministerios', idSede],
    queryFn: () => getMinisterios(idSede),
    staleTime: 5 * 60 * 1000,
  })
}

export function useMiembrosMinisterio(idMinisterio: number) {
  return useQuery({
    queryKey: ['miembros', idMinisterio],
    queryFn: () => getMiembrosMinisterio(idMinisterio),
    enabled: !!idMinisterio,
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/ministerios.service.ts src/hooks/useMinisterios.ts
git commit -m "feat: add ministerios service and hooks"
```

---

## Task 13: Service + Hook — Usuarios

**Files:** `src/services/usuarios.service.ts`, `src/hooks/useUsuarios.ts`

- [ ] **Step 1: Create src/services/usuarios.service.ts**

```typescript
import { supabase } from '@/lib/supabaseClient'
import type { Rol, Usuario, UsuarioRol } from '@/types/app.types'
import type { Database } from '@/types/database.types'

type RolRow = Database['public']['Tables']['rol']['Row']
type UsuarioRow = Database['public']['Tables']['usuario']['Row']
type UsuarioRolRow = Database['public']['Tables']['usuario_rol']['Row']

function mapRol(r: RolRow): Rol {
  return {
    idRol: r.id_rol,
    nombre: r.nombre,
    descripcion: r.descripcion,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapUsuario(r: UsuarioRow): Usuario {
  return {
    idUsuario: r.id_usuario,
    nombres: r.nombres,
    apellidos: r.apellidos,
    correo: r.correo,
    contrasenaHash: r.contrasena_hash,
    telefono: r.telefono,
    activo: r.activo,
    ultimoAcceso: r.ultimo_acceso,
    authUserId: (r as any).auth_user_id ?? null,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapUsuarioRol(r: UsuarioRolRow): UsuarioRol {
  return {
    idUsuarioRol: r.id_usuario_rol,
    idUsuario: r.id_usuario,
    idRol: r.id_rol,
    idIglesia: r.id_iglesia,
    idSede: r.id_sede,
    fechaInicio: r.fecha_inicio,
    fechaFin: r.fecha_fin,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

export async function getRoles(): Promise<Rol[]> {
  const { data, error } = await supabase.from('rol').select('*').order('nombre')
  if (error) throw error
  return data.map(mapRol)
}

export async function getUsuarios(): Promise<Usuario[]> {
  const { data, error } = await supabase.from('usuario').select('*').order('apellidos')
  if (error) throw error
  return data.map(mapUsuario)
}

export async function getUsuarioRoles(idUsuario: number): Promise<UsuarioRol[]> {
  const { data, error } = await supabase
    .from('usuario_rol')
    .select('*')
    .eq('id_usuario', idUsuario)
    .is('fecha_fin', null)
  if (error) throw error
  return data.map(mapUsuarioRol)
}
```

> Note: `(r as any).auth_user_id` is used because the column was added in Task 4 migration. After Task 4's regeneration of `database.types.ts`, `auth_user_id` will be in the types and the `as any` cast can be removed.

- [ ] **Step 2: Create src/hooks/useUsuarios.ts**

```typescript
import { useQuery } from '@tanstack/react-query'
import { getRoles, getUsuarios, getUsuarioRoles } from '@/services/usuarios.service'

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
    staleTime: 30 * 60 * 1000,
  })
}

export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: getUsuarios,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUsuarioRoles(idUsuario: number) {
  return useQuery({
    queryKey: ['usuario-rol', idUsuario],
    queryFn: () => getUsuarioRoles(idUsuario),
    enabled: !!idUsuario,
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/usuarios.service.ts src/hooks/useUsuarios.ts
git commit -m "feat: add usuarios service and hooks"
```

---

## Task 14: Service + Hook — Eventos

**Files:** `src/services/eventos.service.ts`, `src/hooks/useEventos.ts`

- [ ] **Step 1: Create src/services/eventos.service.ts**

```typescript
import { supabase } from '@/lib/supabaseClient'
import type { TipoEvento, Evento, Tarea, TareaAsignada } from '@/types/app.types'
import type { Database } from '@/types/database.types'

type TipoEventoRow = Database['public']['Tables']['tipo_evento']['Row']
type EventoRow = Database['public']['Tables']['evento']['Row']
type TareaRow = Database['public']['Tables']['tarea']['Row']
type TareaAsignadaRow = Database['public']['Tables']['tarea_asignada']['Row']

function mapTipoEvento(r: TipoEventoRow): TipoEvento {
  return {
    idTipoEvento: r.id_tipo_evento,
    nombre: r.nombre,
    descripcion: r.descripcion,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapEvento(r: EventoRow): Evento {
  return {
    idEvento: r.id_evento,
    nombre: r.nombre,
    descripcion: r.descripcion,
    idTipoEvento: r.id_tipo_evento,
    fechaInicio: r.fecha_inicio,
    fechaFin: r.fecha_fin,
    estado: r.estado as Evento['estado'],
    idIglesia: r.id_iglesia,
    idSede: r.id_sede,
    idMinisterio: r.id_ministerio,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapTarea(r: TareaRow): Tarea {
  return {
    idTarea: r.id_tarea,
    titulo: r.titulo,
    descripcion: r.descripcion,
    fechaLimite: r.fecha_limite,
    estado: r.estado as Tarea['estado'],
    prioridad: r.prioridad as Tarea['prioridad'],
    idEvento: r.id_evento,
    idUsuarioCreador: r.id_usuario_creador,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapTareaAsignada(r: TareaAsignadaRow): TareaAsignada {
  return {
    idTareaAsignada: r.id_tarea_asignada,
    idTarea: r.id_tarea,
    idUsuario: r.id_usuario,
    fechaAsignacion: r.fecha_asignacion,
    fechaCompletado: r.fecha_completado,
    observaciones: r.observaciones,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

export async function getTiposEvento(): Promise<TipoEvento[]> {
  const { data, error } = await supabase.from('tipo_evento').select('*').order('nombre')
  if (error) throw error
  return data.map(mapTipoEvento)
}

export async function getEventos(idIglesia?: number): Promise<Evento[]> {
  let q = supabase.from('evento').select('*').order('fecha_inicio', { ascending: false })
  if (idIglesia) q = q.eq('id_iglesia', idIglesia)
  const { data, error } = await q
  if (error) throw error
  return data.map(mapEvento)
}

export async function getTareas(): Promise<Tarea[]> {
  const { data, error } = await supabase
    .from('tarea')
    .select('*')
    .order('fecha_limite', { ascending: true })
  if (error) throw error
  return data.map(mapTarea)
}

export async function getTareasAsignadas(idUsuario: number): Promise<TareaAsignada[]> {
  const { data, error } = await supabase
    .from('tarea_asignada')
    .select('*')
    .eq('id_usuario', idUsuario)
  if (error) throw error
  return data.map(mapTareaAsignada)
}
```

- [ ] **Step 2: Create src/hooks/useEventos.ts**

```typescript
import { useQuery } from '@tanstack/react-query'
import { getTiposEvento, getEventos, getTareas, getTareasAsignadas } from '@/services/eventos.service'

export function useTiposEvento() {
  return useQuery({
    queryKey: ['tipos-evento'],
    queryFn: getTiposEvento,
    staleTime: 30 * 60 * 1000,
  })
}

export function useEventos(idIglesia?: number) {
  return useQuery({
    queryKey: ['eventos', idIglesia],
    queryFn: () => getEventos(idIglesia),
    staleTime: 60 * 1000,
  })
}

export function useTareas() {
  return useQuery({
    queryKey: ['tareas'],
    queryFn: getTareas,
    staleTime: 60 * 1000,
  })
}

export function useTareasAsignadas(idUsuario: number) {
  return useQuery({
    queryKey: ['tareas-asignadas', idUsuario],
    queryFn: () => getTareasAsignadas(idUsuario),
    enabled: !!idUsuario,
    staleTime: 60 * 1000,
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/eventos.service.ts src/hooks/useEventos.ts
git commit -m "feat: add eventos service and hooks"
```

---

## Task 15: Service + Hook — Cursos

**Files:** `src/services/cursos.service.ts`, `src/hooks/useCursos.ts`

- [ ] **Step 1: Create src/services/cursos.service.ts**

```typescript
import { supabase } from '@/lib/supabaseClient'
import type {
  Curso, Modulo, Recurso, Evaluacion,
  ProcesoAsignadoCurso, DetalleProcesoCurso,
} from '@/types/app.types'
import type { Database } from '@/types/database.types'

type CursoRow = Database['public']['Tables']['curso']['Row']
type ModuloRow = Database['public']['Tables']['modulo']['Row']
type RecursoRow = Database['public']['Tables']['recurso']['Row']
type EvaluacionRow = Database['public']['Tables']['evaluacion']['Row']
type ProcesoRow = Database['public']['Tables']['proceso_asignado_curso']['Row']
type DetalleRow = Database['public']['Tables']['detalle_proceso_curso']['Row']

function mapCurso(r: CursoRow): Curso {
  return {
    idCurso: r.id_curso,
    nombre: r.nombre,
    descripcion: r.descripcion,
    duracionHoras: r.duracion_horas,
    estado: r.estado as Curso['estado'],
    idMinisterio: r.id_ministerio,
    idUsuarioCreador: r.id_usuario_creador,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapModulo(r: ModuloRow): Modulo {
  return {
    idModulo: r.id_modulo,
    titulo: r.titulo,
    descripcion: r.descripcion,
    orden: r.orden,
    estado: r.estado as Modulo['estado'],
    idCurso: r.id_curso,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapRecurso(r: RecursoRow): Recurso {
  return {
    idRecurso: r.id_recurso,
    idModulo: r.id_modulo,
    nombre: r.nombre,
    tipo: r.tipo as Recurso['tipo'],
    url: r.url,
  }
}

function mapEvaluacion(r: EvaluacionRow): Evaluacion {
  return {
    idEvaluacion: r.id_evaluacion,
    idModulo: r.id_modulo,
    idUsuario: r.id_usuario,
    calificacion: r.calificacion,
    estado: r.estado as Evaluacion['estado'],
    observaciones: r.observaciones,
    fechaEvaluacion: r.fecha_evaluacion,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapProceso(r: ProcesoRow): ProcesoAsignadoCurso {
  return {
    idProcesoAsignadoCurso: r.id_proceso_asignado_curso,
    idCurso: r.id_curso,
    idIglesia: r.id_iglesia,
    fechaInicio: r.fecha_inicio,
    fechaFin: r.fecha_fin,
    estado: r.estado as ProcesoAsignadoCurso['estado'],
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

function mapDetalle(r: DetalleRow): DetalleProcesoCurso {
  return {
    idDetalleProcesoCurso: r.id_detalle_proceso_curso,
    idProcesoAsignadoCurso: r.id_proceso_asignado_curso,
    idUsuario: r.id_usuario,
    fechaInscripcion: r.fecha_inscripcion,
    estado: r.estado as DetalleProcesoCurso['estado'],
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

export async function getCursos(idMinisterio?: number): Promise<Curso[]> {
  let q = supabase.from('curso').select('*').order('nombre')
  if (idMinisterio) q = q.eq('id_ministerio', idMinisterio)
  const { data, error } = await q
  if (error) throw error
  return data.map(mapCurso)
}

export async function getModulos(idCurso: number): Promise<Modulo[]> {
  const { data, error } = await supabase
    .from('modulo')
    .select('*')
    .eq('id_curso', idCurso)
    .order('orden')
  if (error) throw error
  return data.map(mapModulo)
}

export async function getRecursos(idModulo: number): Promise<Recurso[]> {
  const { data, error } = await supabase
    .from('recurso')
    .select('*')
    .eq('id_modulo', idModulo)
  if (error) throw error
  return data.map(mapRecurso)
}

export async function getEvaluaciones(idUsuario?: number): Promise<Evaluacion[]> {
  let q = supabase.from('evaluacion').select('*')
  if (idUsuario) q = q.eq('id_usuario', idUsuario)
  const { data, error } = await q
  if (error) throw error
  return data.map(mapEvaluacion)
}

export async function getProcesosAsignadoCurso(): Promise<ProcesoAsignadoCurso[]> {
  const { data, error } = await supabase
    .from('proceso_asignado_curso')
    .select('*')
    .order('fecha_inicio', { ascending: false })
  if (error) throw error
  return data.map(mapProceso)
}

export async function getDetallesProcesoCurso(idProceso: number): Promise<DetalleProcesoCurso[]> {
  const { data, error } = await supabase
    .from('detalle_proceso_curso')
    .select('*')
    .eq('id_proceso_asignado_curso', idProceso)
  if (error) throw error
  return data.map(mapDetalle)
}
```

- [ ] **Step 2: Create src/hooks/useCursos.ts**

```typescript
import { useQuery } from '@tanstack/react-query'
import {
  getCursos, getModulos, getRecursos, getEvaluaciones,
  getProcesosAsignadoCurso, getDetallesProcesoCurso,
} from '@/services/cursos.service'

export function useCursos(idMinisterio?: number) {
  return useQuery({
    queryKey: ['cursos', idMinisterio],
    queryFn: () => getCursos(idMinisterio),
    staleTime: 5 * 60 * 1000,
  })
}

export function useModulos(idCurso: number) {
  return useQuery({
    queryKey: ['modulos', idCurso],
    queryFn: () => getModulos(idCurso),
    enabled: !!idCurso,
    staleTime: 5 * 60 * 1000,
  })
}

export function useRecursos(idModulo: number) {
  return useQuery({
    queryKey: ['recursos', idModulo],
    queryFn: () => getRecursos(idModulo),
    enabled: !!idModulo,
    staleTime: 5 * 60 * 1000,
  })
}

export function useEvaluaciones(idUsuario?: number) {
  return useQuery({
    queryKey: ['evaluaciones', idUsuario],
    queryFn: () => getEvaluaciones(idUsuario),
    staleTime: 5 * 60 * 1000,
  })
}

export function useProcesosAsignadoCurso() {
  return useQuery({
    queryKey: ['procesos-curso'],
    queryFn: getProcesosAsignadoCurso,
    staleTime: 5 * 60 * 1000,
  })
}

export function useDetallesProcesoCurso(idProceso: number) {
  return useQuery({
    queryKey: ['detalles-proceso', idProceso],
    queryFn: () => getDetallesProcesoCurso(idProceso),
    enabled: !!idProceso,
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/cursos.service.ts src/hooks/useCursos.ts
git commit -m "feat: add cursos service and hooks"
```

---

## Task 16: Service + Hook — Notificaciones

**Files:** `src/services/notificaciones.service.ts`, `src/hooks/useNotificaciones.ts`

- [ ] **Step 1: Create src/services/notificaciones.service.ts**

```typescript
import { supabase } from '@/lib/supabaseClient'
import type { Notificacion } from '@/types/app.types'
import type { Database } from '@/types/database.types'

type NotificacionRow = Database['public']['Tables']['notificacion']['Row']

function mapNotificacion(r: NotificacionRow): Notificacion {
  return {
    idNotificacion: r.id_notificacion,
    idUsuario: r.id_usuario,
    titulo: r.titulo,
    mensaje: r.mensaje,
    leida: r.leida,
    fechaLectura: r.fecha_lectura,
    tipo: r.tipo as Notificacion['tipo'],
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }
}

export async function getNotificaciones(idUsuario: number): Promise<Notificacion[]> {
  const { data, error } = await supabase
    .from('notificacion')
    .select('*')
    .eq('id_usuario', idUsuario)
    .order('creado_en', { ascending: false })
  if (error) throw error
  return data.map(mapNotificacion)
}
```

- [ ] **Step 2: Create src/hooks/useNotificaciones.ts**

```typescript
import { useQuery } from '@tanstack/react-query'
import { getNotificaciones } from '@/services/notificaciones.service'

export function useNotificaciones(idUsuario: number) {
  return useQuery({
    queryKey: ['notificaciones', idUsuario],
    queryFn: () => getNotificaciones(idUsuario),
    enabled: !!idUsuario,
    staleTime: 30 * 1000,
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/notificaciones.service.ts src/hooks/useNotificaciones.ts
git commit -m "feat: add notificaciones service and hook"
```

---

## Task 17: Migrate GeographyPage

**Files:** `src/app/components/GeographyPage.tsx`

- [ ] **Step 1: Read the file**

Read `src/app/components/GeographyPage.tsx` to understand current structure.

- [ ] **Step 2: Apply migration pattern**

At the top of the file, add these imports (remove `useApp` import):

```typescript
import { usePaises, useDepartamentos, useCiudades } from '@/hooks/useGeografia'
```

At the top of the component function body, replace:

```typescript
// REMOVE THIS:
const { paises, departamentosGeo, ciudades, addPais, updatePais, deletePais,
        addDepartamentoGeo, updateDepartamentoGeo, deleteDepartamentoGeo,
        addCiudad, updateCiudad, deleteCiudad } = useApp()
```

With:

```typescript
const { data: paises = [], isLoading: paisesLoading } = usePaises()
const { data: departamentosGeo = [], isLoading: deptosLoading } = useDepartamentos()
const { data: ciudades = [], isLoading: ciudadesLoading } = useCiudades()
const isLoading = paisesLoading || deptosLoading || ciudadesLoading
```

Add a loading guard as the first line of the JSX return:

```typescript
if (isLoading) return <div className="p-8 text-muted-foreground">Cargando geografía...</div>
```

Replace mutation handlers (addPais etc.) with stub functions that do nothing for now (Phase 3 will implement them):

```typescript
const addPais = (_nombre: string) => { /* Phase 3 */ }
const updatePais = (_id: number, _nombre: string) => { /* Phase 3 */ }
const deletePais = (_id: number) => { /* Phase 3 */ }
const addDepartamentoGeo = (_nombre: string, _idPais: number) => { /* Phase 3 */ }
const updateDepartamentoGeo = (_id: number, _nombre: string) => { /* Phase 3 */ }
const deleteDepartamentoGeo = (_id: number) => { /* Phase 3 */ }
const addCiudad = (_nombre: string, _idDepto: number) => { /* Phase 3 */ }
const updateCiudad = (_id: number, _nombre: string) => { /* Phase 3 */ }
const deleteCiudad = (_id: number) => { /* Phase 3 */ }
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Navigate to http://localhost:5173/app/geografia. Expected: Colombia geography shows (1 país, 6 departamentos, 12 ciudades). No network errors in DevTools.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/GeographyPage.tsx
git commit -m "feat: GeographyPage reads from Supabase via useGeografia hooks"
```

---

## Task 18: Migrate ChurchesPage, SedesPage, PastoresPage

**Files:** `src/app/components/ChurchesPage.tsx`, `src/app/components/SedesPage.tsx`, `src/app/components/PastoresPage.tsx`

- [ ] **Step 1: Read each file**

Read `ChurchesPage.tsx`, `SedesPage.tsx`, `PastoresPage.tsx`.

- [ ] **Step 2: Update ChurchesPage.tsx**

Add import: `import { useIglesias, usePastores, useIglesiaPastores } from '@/hooks/useIglesias'`

Replace AppContext destructuring:
```typescript
const { data: iglesias = [], isLoading: iglesiasLoading } = useIglesias()
const { data: pastores = [] } = usePastores()
const { data: iglesiaPastores = [] } = useIglesiaPastores()
const isLoading = iglesiasLoading
```

Add loading guard: `if (isLoading) return <div className="p-8 text-muted-foreground">Cargando iglesias...</div>`

Stub mutation handlers (toggleIglesiaEstado, updateIglesia, createIglesia) as no-ops for Phase 3.

- [ ] **Step 3: Update SedesPage.tsx**

Add import: `import { useSedes, useIglesias } from '@/hooks/useIglesias'`

Replace AppContext destructuring:
```typescript
const { data: sedes = [], isLoading } = useSedes()
const { data: iglesias = [] } = useIglesias()
```

Add loading guard. Stub mutation handlers.

- [ ] **Step 4: Update PastoresPage.tsx**

Add import: `import { usePastores, useIglesias, useIglesiaPastores } from '@/hooks/useIglesias'`

Replace AppContext destructuring:
```typescript
const { data: pastores = [], isLoading } = usePastores()
const { data: iglesias = [] } = useIglesias()
const { data: iglesiaPastores = [] } = useIglesiaPastores()
```

Add loading guard. Stub mutation handlers.

- [ ] **Step 5: Verify in browser**

Navigate to `/app/iglesias`, `/app/sedes`, `/app/pastores`. Expected: seed data shows ("Iglesia Central", "Sede Principal"). No console errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/components/ChurchesPage.tsx src/app/components/SedesPage.tsx src/app/components/PastoresPage.tsx
git commit -m "feat: ChurchesPage, SedesPage, PastoresPage use real Supabase data"
```

---

## Task 19: Migrate DepartmentsPage, MyDepartmentPage, MembersPage

**Files:** `src/app/components/DepartmentsPage.tsx`, `src/app/components/MyDepartmentPage.tsx`, `src/app/components/MembersPage.tsx`

- [ ] **Step 1: Read each file**

Read `DepartmentsPage.tsx`, `MyDepartmentPage.tsx`, `MembersPage.tsx`.

- [ ] **Step 2: Update DepartmentsPage.tsx**

Add import: `import { useMinisterios } from '@/hooks/useMinisterios'`

Replace AppContext ministerios:
```typescript
const { data: ministerios = [], isLoading } = useMinisterios()
```

Add loading guard. Stub mutations.

- [ ] **Step 3: Update MyDepartmentPage.tsx**

Add imports: `import { useMinisterios } from '@/hooks/useMinisterios'`

```typescript
const { data: ministerios = [], isLoading } = useMinisterios()
// Use ministerios[0] as the current user's ministerio (single-ministerio seed data)
const ministerio = ministerios[0] ?? null
```

- [ ] **Step 4: Update MembersPage.tsx**

Add import: `import { useMinisterios, useMiembrosMinisterio } from '@/hooks/useMinisterios'`

```typescript
const { data: ministerios = [] } = useMinisterios()
const [selectedMinisterioId, setSelectedMinisterioId] = useState<number>(0)
const { data: miembros = [], isLoading } = useMiembrosMinisterio(selectedMinisterioId)
```

- [ ] **Step 5: Verify in browser**

Navigate to `/app/departamentos`, `/app/mi-departamento`, `/app/miembros`. Expected: "Ministerio de Jóvenes" displays from seed.

- [ ] **Step 6: Commit**

```bash
git add src/app/components/DepartmentsPage.tsx src/app/components/MyDepartmentPage.tsx src/app/components/MembersPage.tsx
git commit -m "feat: ministerios pages use real Supabase data"
```

---

## Task 20: Migrate UsuariosPage, CatalogosPage

**Files:** `src/app/components/UsuariosPage.tsx`, `src/app/components/CatalogosPage.tsx`

- [ ] **Step 1: Read each file**

Read `UsuariosPage.tsx`, `CatalogosPage.tsx`.

- [ ] **Step 2: Update UsuariosPage.tsx**

Add import: `import { useUsuarios, useRoles } from '@/hooks/useUsuarios'`

```typescript
const { data: usuarios = [], isLoading } = useUsuarios()
const { data: roles = [] } = useRoles()
```

Stub mutations (toggleUsuarioActivo) as no-ops.

- [ ] **Step 3: Update CatalogosPage.tsx**

Add imports: `import { useRoles } from '@/hooks/useUsuarios'` and `import { useTiposEvento } from '@/hooks/useEventos'`

```typescript
const { data: roles = [], isLoading: rolesLoading } = useRoles()
const { data: tiposEvento = [], isLoading: tiposLoading } = useTiposEvento()
const isLoading = rolesLoading || tiposLoading
```

Stub mutations.

- [ ] **Step 4: Verify in browser**

Navigate to `/app/usuarios`, `/app/catalogos`. Expected: 4 roles and 6 tipos de evento display from seed.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/UsuariosPage.tsx src/app/components/CatalogosPage.tsx
git commit -m "feat: UsuariosPage and CatalogosPage use real Supabase data"
```

---

## Task 21: Migrate EventsPage, TasksPage

**Files:** `src/app/components/EventsPage.tsx`, `src/app/components/TasksPage.tsx`

- [ ] **Step 1: Read each file**

Read `EventsPage.tsx`, `TasksPage.tsx`.

- [ ] **Step 2: Update EventsPage.tsx**

Add import: `import { useEventos, useTiposEvento } from '@/hooks/useEventos'`

```typescript
const { data: eventos = [], isLoading } = useEventos()
const { data: tiposEvento = [] } = useTiposEvento()
```

Stub mutations.

- [ ] **Step 3: Update TasksPage.tsx**

Add import: `import { useTareas } from '@/hooks/useEventos'`

```typescript
const { data: tareas = [], isLoading } = useTareas()
```

Stub mutations.

- [ ] **Step 4: Verify in browser**

Navigate to `/app/eventos`. Expected: seed event "Culto Dominical" (próximo domingo) shows.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/EventsPage.tsx src/app/components/TasksPage.tsx
git commit -m "feat: EventsPage and TasksPage use real Supabase data"
```

---

## Task 22: Migrate ClassroomPage, EvaluationsPage, CiclosLectivosPage

**Files:** `src/app/components/ClassroomPage.tsx`, `src/app/components/EvaluationsPage.tsx`, `src/app/components/CiclosLectivosPage.tsx`

- [ ] **Step 1: Read each file**

Read `ClassroomPage.tsx`, `EvaluationsPage.tsx`, `CiclosLectivosPage.tsx`.

- [ ] **Step 2: Update ClassroomPage.tsx**

Add import: `import { useCursos } from '@/hooks/useCursos'`

```typescript
const { data: cursos = [], isLoading } = useCursos()
```

Stub mutations.

- [ ] **Step 3: Update EvaluationsPage.tsx**

Add imports: `import { useEvaluaciones } from '@/hooks/useCursos'` and keep `import { useApp } from '../store/AppContext'`

```typescript
const { usuarioActual } = useApp()
const { data: evaluaciones = [], isLoading } = useEvaluaciones(usuarioActual?.idUsuario)
```

- [ ] **Step 4: Update CiclosLectivosPage.tsx**

Add import: `import { useProcesosAsignadoCurso } from '@/hooks/useCursos'`

```typescript
const { data: procesosAsignadoCurso = [], isLoading } = useProcesosAsignadoCurso()
```

Stub mutations.

- [ ] **Step 5: Verify in browser**

Navigate to `/app/aula`. Expected: empty state (no courses yet since curso seed depends on a real usuario). After creating admin user (see post-plan step), the demo curso should appear.

- [ ] **Step 6: Commit**

```bash
git add src/app/components/ClassroomPage.tsx src/app/components/EvaluationsPage.tsx src/app/components/CiclosLectivosPage.tsx
git commit -m "feat: classroom and evaluaciones pages use real Supabase data"
```

---

## Task 23: Migrate NotificationsPage, DashboardPage, ProfilePage — final check

**Files:** `src/app/components/NotificationsPage.tsx`, `src/app/components/DashboardPage.tsx`, `src/app/components/ProfilePage.tsx`

- [ ] **Step 1: Read each file**

Read `NotificationsPage.tsx`, `DashboardPage.tsx`, `ProfilePage.tsx`.

- [ ] **Step 2: Update NotificationsPage.tsx**

Add imports: `import { useNotificaciones } from '@/hooks/useNotificaciones'` and keep `useApp`

```typescript
const { usuarioActual } = useApp()
const { data: notificaciones = [], isLoading } = useNotificaciones(usuarioActual?.idUsuario ?? 0)
```

- [ ] **Step 3: Update DashboardPage.tsx**

Replace mock data with hooks. Keep `useApp` for `usuarioActual` and `notificacionesCount`:

```typescript
import { useIglesias } from '@/hooks/useIglesias'
import { useEventos } from '@/hooks/useEventos'
import { useApp } from '../store/AppContext'

const { usuarioActual, notificacionesCount } = useApp()
const { data: iglesias = [] } = useIglesias()
const { data: eventos = [] } = useEventos()
```

Remove any remaining AppContext destructuring for mock data arrays (roles, usuarios, ministerios, etc.) — replace with empty arrays `[]` or the relevant hook if the dashboard shows that data.

- [ ] **Step 4: Update ProfilePage.tsx**

ProfilePage shows the current user. Replace `user: SessionUser` references with `usuarioActual: Usuario`:

```typescript
const { usuarioActual } = useApp()
// Replace all references to user.nombres, user.correo, etc. with usuarioActual?.nombres, etc.
```

- [ ] **Step 5: TypeScript final check**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

Expected: 0 errors (all AppContext mock references removed from all components).

- [ ] **Step 6: Verify end-to-end**

1. Open http://localhost:5173/login
2. Log in with `admin@iglesiabd.com` / `Password123!` (must exist in Supabase Auth — see post-plan step)
3. Expected: login succeeds → redirects to `/app/`
4. Navigate every route — each should load data or show an empty state
5. Open React Query Devtools (bottom-right corner) — should see cached query keys like `['paises']`, `['iglesias']`, `['eventos', undefined]`
6. No mock Guatemala/El Salvador data should appear anywhere

- [ ] **Step 7: Final commit**

```bash
git add src/app/components/NotificationsPage.tsx src/app/components/DashboardPage.tsx src/app/components/ProfilePage.tsx
git commit -m "feat: complete Supabase integration — all pages read real data, 0 mocks active"
```

---

## Post-plan: Create demo auth user

After all tasks complete, create the demo admin user in Supabase:

1. Open Supabase Dashboard → https://supabase.com/dashboard/project/heibyjbvfiokmduwwawm
2. Go to **Authentication → Users → Add user**
3. Set email: `admin@iglesiabd.com`, password: `Password123!`
4. The `handle_new_user()` trigger fires automatically and creates a row in `public.usuario`
5. Then seed the demo curso (requires a valid `id_usuario_creador`):

Use MCP `mcp__plugin_supabase_supabase__execute_sql`:
```sql
INSERT INTO public.curso (nombre, descripcion, duracion_horas, estado, id_ministerio, id_usuario_creador)
SELECT
  'Fundamentos de Fe',
  'Curso introductorio para nuevos creyentes',
  20,
  'activo',
  m.id_ministerio,
  u.id_usuario
FROM public.ministerio m, public.usuario u
WHERE m.nombre = 'Ministerio de Jóvenes'
  AND u.correo = 'admin@iglesiabd.com'
ON CONFLICT DO NOTHING;
```

6. Verify:
```sql
SELECT id_usuario, correo, nombres, auth_user_id FROM public.usuario;
```
Expected: 1 row for `admin@iglesiabd.com` with a non-null `auth_user_id`.

---

## Checklist (from spec)

- [ ] `.env` created with URL and anon key
- [ ] `@supabase/supabase-js` and `@tanstack/react-query` installed
- [ ] `src/lib/supabaseClient.ts` created and typed with `Database`
- [ ] `src/types/database.types.ts` generated from Supabase
- [ ] `src/types/app.types.ts` with camelCase interfaces (number IDs)
- [ ] Migration: `auth_user_id` column + `handle_new_user` trigger
- [ ] Migration: RLS SELECT policies for 19 tables
- [ ] Migration: FK indexes (5 new indexes)
- [ ] Migration: seed data (Colombia geo + roles + tipos + demo iglesia/sede/ministerio/evento)
- [ ] `QueryClientProvider` wrapping app in `main.tsx`
- [ ] `AppContext.tsx` reduced to session + UI state
- [ ] `LoginPage.tsx` uses `supabase.auth.signInWithPassword()`
- [ ] 7 service files implemented with mapper pattern
- [ ] 7 hook files implemented with React Query
- [ ] All 14 feature pages reading from Supabase (0 mocks)
- [ ] App loads correctly with seed data after login
