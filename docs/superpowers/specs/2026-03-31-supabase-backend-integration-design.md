# Diseño: Integración Backend Supabase — IGLESIABD (Fases 0–2)

**Fecha:** 2026-03-31  
**Proyecto:** IGLESIABD — Church Management SPA  
**Supabase Project ID:** `heibyjbvfiokmduwwawm`  
**Alcance:** Setup base + Auth + RLS correcta + Seed data + Lecturas reales (sin mutaciones ni CI/CD)

---

## 1. Contexto y estado actual

### Lo que existe
- Supabase project activo (`sa-east-1`, status `ACTIVE_HEALTHY`)
- 24 tablas con esquema completo, 35 FKs, 13 enums custom
- 16 migraciones versionadas y aplicadas
- RLS habilitado en todas las tablas
- Índices en columnas críticas (`evento.fecha_inicio`, `notificacion` no-leída, `usuario_rol` activo)
- Triggers `updated_at` en todas las tablas

### Gaps críticos que resuelve este diseño

| # | Problema | Severidad |
|---|----------|-----------|
| 1 | `@supabase/supabase-js` no instalado | 🔴 Bloqueante |
| 2 | Sin `.env` (URL y anon key no configurados) | 🔴 Bloqueante |
| 3 | Sin `src/lib/supabaseClient.ts` | 🔴 Bloqueante |
| 4 | RLS incompleta — 19 tablas solo tienen `service_role` | 🔴 Bloqueante |
| 5 | Auth no integrada — `usuario.contrasena_hash` sin vínculo a `auth.users` | 🔴 Bloqueante |
| 6 | Todas las tablas vacías (0 filas, ni catálogos) | 🟠 Alto |
| 7 | Sin mapper `snake_case → camelCase` | 🟠 Alto |
| 8 | Mismatch de tipos ID (`bigint` BD vs `string` frontend) | 🟠 Alto |
| 9 | Sin React Query — no hay fetching async | 🟠 Alto |
| 10 | `AppContext.tsx` ~6k líneas mezclando interfaces, mocks y handlers | 🟡 Medio |
| 11 | Índices FK faltantes en `sede.id_iglesia`, `ministerio.id_sede`, `evento.id_iglesia` | 🟡 Medio |

---

## 2. Arquitectura — Enfoque "Shared Services Layer"

### Estructura de carpetas nueva

```
src/
├── lib/
│   └── supabaseClient.ts          # Cliente Supabase singleton tipado
├── types/
│   ├── database.types.ts          # Tipos generados desde Supabase (snake_case, bigint→number)
│   └── app.types.ts               # Interfaces camelCase del frontend (extraídas de AppContext)
├── services/
│   ├── geografia.service.ts       # pais, departamento, ciudad
│   ├── iglesias.service.ts        # iglesia, pastor, sede, iglesia_pastor, sede_pastor
│   ├── ministerios.service.ts     # ministerio, miembro_ministerio
│   ├── usuarios.service.ts        # usuario, rol, usuario_rol
│   ├── eventos.service.ts         # evento, tipo_evento, tarea, tarea_asignada
│   ├── cursos.service.ts          # curso, modulo, evaluacion, recurso, proceso_asignado_curso
│   └── notificaciones.service.ts  # notificacion
├── hooks/
│   ├── useGeografia.ts
│   ├── useIglesias.ts
│   ├── useMinisterios.ts
│   ├── useUsuarios.ts
│   ├── useEventos.ts
│   ├── useCursos.ts
│   └── useNotificaciones.ts
└── app/
    └── store/
        └── AppContext.tsx          # Reducido: auth session + UI state (sidebar, modales)
```

### Principio de separación
- **services/** = funciones puras que llaman a Supabase y aplican el mapper. No conocen React.
- **hooks/** = hooks React Query que consumen los services y gestionan caché, loading, error.
- **components/** = consumen los hooks. Nunca ven `snake_case` ni llaman a Supabase directamente.

---

## 3. Setup base

### Variables de entorno (`.env`)

```
VITE_SUPABASE_URL=https://heibyjbvfiokmduwwawm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlaWJ5amJ2Zmlva21kdXd3YXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MDAzNjEsImV4cCI6MjA4OTA3NjM2MX0.dCwu7xz1hExRFX1brCGDZySW0aacxBaV-yjPt0bqVZI
```

Agregar `.env` a `.gitignore` (si no está ya).

### `src/lib/supabaseClient.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

### Dependencias a instalar

```bash
npm install @supabase/supabase-js @tanstack/react-query @tanstack/react-query-devtools
```

### QueryClient en `main.tsx`

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
})

// Envolver RouterProvider con QueryClientProvider
```

---

## 4. Autenticación

### Estrategia
Supabase Auth (email + password). La tabla `usuario` se vincula a `auth.users` mediante una columna `auth_user_id UUID`.

### Cambio de esquema en `usuario`

```sql
ALTER TABLE public.usuario
  ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX idx_usuario_auth_user_id ON public.usuario(auth_user_id);
```

### Trigger de auto-provisión de perfil

Al crear un usuario en `auth.users` (registro), se inserta automáticamente en `public.usuario`:

```sql
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

### Flujo de login en el frontend

```
LoginPage
  → supabase.auth.signInWithPassword({ email, password })
  → AppContext: guardar session + cargar perfil usuario
  → Redirect a /dashboard
```

### AppContext reducido

```typescript
interface AppState {
  session: Session | null          // Supabase Auth session
  usuarioActual: Usuario | null    // Perfil de public.usuario
  sidebarOpen: boolean
  notificacionesCount: number      // Solo el contador, no la lista
}
```

La escucha de cambios de sesión se hace con `supabase.auth.onAuthStateChange()` dentro de un `useEffect` en `AppProvider`.

---

## 5. RLS — Políticas por tabla

### Tablas de catálogo (lectura pública para autenticados)

Aplica a: `iglesia`, `sede`, `pastor`, `ministerio`, `tipo_evento`, `evento`, `tarea`, `curso`, `modulo`, `recurso`, `rol`, `usuario_rol`, `miembro_ministerio`, `iglesia_pastor`, `sede_pastor`, `proceso_asignado_curso`

```sql
CREATE POLICY "Lectura autenticada"
ON public.<tabla> FOR SELECT
TO authenticated
USING (true);
```

### Tabla `usuario` (solo el propio registro + admins)

```sql
-- El usuario ve su propio perfil
CREATE POLICY "Usuario ve su propio perfil"
ON public.usuario FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());
```

### Tabla `notificacion` (solo las propias)

```sql
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
```

### Tablas `tarea_asignada` y `evaluacion` (solo las propias)

Mismo patrón que `notificacion`: filtrar por `id_usuario` del usuario autenticado.

### Índices FK faltantes (a agregar en migración)

```sql
CREATE INDEX idx_sede_id_iglesia ON public.sede(id_iglesia);
CREATE INDEX idx_ministerio_id_sede ON public.ministerio(id_sede);
CREATE INDEX idx_evento_id_iglesia ON public.evento(id_iglesia);
CREATE INDEX idx_tarea_id_evento ON public.tarea(id_evento);
CREATE INDEX idx_notificacion_id_usuario ON public.notificacion(id_usuario);
```

---

## 6. Capa de Datos

### Patrón de mapper en services

Cada service implementa funciones de mapeo `snake_case → camelCase`. Los IDs `bigint` se mantienen como `number` en el frontend (no `string` como estaba en los mocks).

```typescript
// services/iglesias.service.ts
import { supabase } from '@/lib/supabaseClient'
import type { Iglesia } from '@/types/app.types'
import type { Database } from '@/types/database.types'

type IglesiaRow = Database['public']['Tables']['iglesia']['Row']

function mapIglesia(row: IglesiaRow): Iglesia {
  return {
    idIglesia: row.id_iglesia,
    nombre: row.nombre,
    fechaFundacion: row.fecha_fundacion,
    estado: row.estado,
    idCiudad: row.id_ciudad,
    creadoEn: row.creado_en,
    actualizadoEn: row.updated_at,
  }
}

export async function getIglesias(): Promise<Iglesia[]> {
  const { data, error } = await supabase
    .from('iglesia')
    .select('*')
    .order('nombre')
  if (error) throw error
  return data.map(mapIglesia)
}

export async function getIglesiaById(id: number): Promise<Iglesia> {
  const { data, error } = await supabase
    .from('iglesia')
    .select('*')
    .eq('id_iglesia', id)
    .single()
  if (error) throw error
  return mapIglesia(data)
}
```

### Patrón de hooks React Query

```typescript
// hooks/useIglesias.ts
import { useQuery } from '@tanstack/react-query'
import { getIglesias, getIglesiaById } from '@/services/iglesias.service'

export function useIglesias() {
  return useQuery({
    queryKey: ['iglesias'],
    queryFn: getIglesias,
    staleTime: 5 * 60 * 1000,  // 5 min — datos que cambian poco
  })
}

export function useIglesia(id: number) {
  return useQuery({
    queryKey: ['iglesias', id],
    queryFn: () => getIglesiaById(id),
    enabled: !!id,
  })
}
```

### Query keys por dominio

| Dominio | Query keys |
|---------|-----------|
| Geografía | `['paises']`, `['departamentos', paisId]`, `['ciudades', deptoId]` |
| Iglesias | `['iglesias']`, `['iglesias', id]`, `['sedes', iglesiaId]`, `['pastores']` |
| Ministerios | `['ministerios', sedeId]`, `['miembros', ministerioId]` |
| Usuarios | `['usuarios']`, `['roles']`, `['usuario-rol', usuarioId]` |
| Eventos | `['eventos', iglesiaId]`, `['tareas', usuarioId]` |
| Cursos | `['cursos', ministerioId]`, `['modulos', cursoId]` |
| Notificaciones | `['notificaciones', usuarioId]` |

### `staleTime` recomendado por dominio

| Dominio | staleTime | Razón |
|---------|-----------|-------|
| Geografía, roles, tipos | 30 min | Catálogos que rara vez cambian |
| Iglesias, sedes, pastores | 5 min | Cambian ocasionalmente |
| Ministerios, cursos | 5 min | Cambios moderados |
| Eventos, tareas | 1 min | Más dinámicos |
| Notificaciones | 30 seg | Frecuentes y time-sensitive |

---

## 7. Seed Data (migración versionada)

### Catálogos base

- **Geografía:** 1 país (Colombia), 6 departamentos, 12 ciudades principales
- **Roles:** Administrador, Pastor, Líder, Miembro
- **Tipos de evento:** Culto dominical, Conferencia, Retiro espiritual, Evangelismo, Reunión de líderes, Actividad de ministerio

### Datos de demo

| Tabla | Dato |
|-------|------|
| `auth.users` | admin@iglesiabd.com (via Supabase Auth Admin API) |
| `usuario` | Auto-creado por trigger |
| `iglesia` | "Iglesia Central" — Bogotá |
| `sede` | "Sede Principal" — Bogotá |
| `pastor` | "Pastor Demo" vinculado al usuario admin |
| `ministerio` | "Ministerio de Jóvenes" |
| `evento` | 1 evento "Culto dominical" próximo |
| `curso` | "Fundamentos de Fe" |

Todo como una migración `paso_seed_inicial` aplicada vía MCP.

---

## 8. Migración de AppContext

### Proceso gradual pero estructurado

1. **Extraer interfaces** de `AppContext.tsx` a `src/types/app.types.ts` — sin cambiar nada más
2. **Reducir AppContext** a solo `session`, `usuarioActual`, `sidebarOpen`, `notificacionesCount`
3. **Dominio por dominio:** cada componente que se conecta a un hook real deja de leer del contexto
4. **El contexto no se borra hasta que todos los componentes del dominio estén migrados**

### Orden de migración por dominio (menor a mayor complejidad)

1. Geografía (solo SELECT, sin relaciones complejas)
2. Catálogos (roles, tipos de evento)
3. Iglesias y sedes
4. Pastores
5. Ministerios y miembros
6. Eventos y tipos
7. Tareas y asignaciones
8. Cursos, módulos, evaluaciones
9. Notificaciones

---

## 9. Fuera del alcance (Fases 3–6)

Los siguientes temas NO forman parte de este diseño y se especificarán por separado:

- Mutaciones (create/update/delete) con validación cliente + BD
- Optimistic updates y rollback
- CI/CD con GitHub Actions + `supabase db push`
- Supabase Storage (avatares, documentos)
- Realtime subscriptions
- Tests de RLS (usuario vs service_role)
- Observabilidad (logs SQL, métricas)

---

## 10. Checklist de salida de Fases 0–2

- [ ] `.env` creado con URL y anon key correctos
- [ ] `@supabase/supabase-js` y `@tanstack/react-query` instalados
- [ ] `src/lib/supabaseClient.ts` creado y tipado con `Database`
- [ ] `src/types/database.types.ts` generado desde Supabase
- [ ] `src/types/app.types.ts` con interfaces camelCase extraídas de AppContext
- [ ] Migración: columna `auth_user_id` en `usuario` + trigger auto-provisión
- [ ] Migración: políticas RLS para las 19 tablas sin cobertura
- [ ] Migración: índices FK faltantes
- [ ] Migración: seed data (catálogos + demo)
- [ ] `AppContext.tsx` reducido a auth + UI state
- [ ] `QueryClientProvider` wrapping `RouterProvider` en `main.tsx`
- [ ] 7 archivos de services implementados con mapper
- [ ] 7 archivos de hooks React Query implementados
- [ ] LoginPage usando `supabase.auth.signInWithPassword()`
- [ ] Todos los componentes leyendo datos reales (0 mocks activos)
- [ ] App carga correctamente con datos del seed en producción
