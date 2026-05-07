# IGLESIABD — Conversión a SaaS Multi-Tenant

**Fecha:** 2026-05-06  
**Estado:** Diseño aprobado  
**Autor:** Sesión de brainstorming  
**Alcance:** Análisis completo + plan de transformación a SaaS multi-tenant

---

## Contexto y motivación

IGLESIABD es una SPA de gestión de iglesias construida con React 18 + Vite + Tailwind CSS v4 con backend en Supabase. El proyecto necesita transformarse en un SaaS multi-tenant robusto donde cada iglesia es un tenant independiente. Actualmente hay inconsistencias de permisos, bugs críticos sin resolver, RLS permisiva en producción, y una estructura de rutas sin aislamiento de tenant.

---

## Decisiones de diseño

### 1. Entidad Pastor vs. Rol Admin de Iglesia

- **`pastor`** = entidad de persona (alguien que es pastor en la iglesia). Tabla se mantiene sin cambios conceptuales.
- **`admin_iglesia`** = rol de sistema asignado a un `usuario`. Completamente independiente de ser pastor.
- Un pastor **puede** tener cuenta de usuario y ser asignado como `admin_iglesia`, pero no es obligatorio.
- La UI mantiene "Pastores" como sección separada (gestión de personas). El badge de rol dice "Administrador de Iglesia".

### 2. Jerarquía de alcance por rol

```
Superadmin           → acceso global a todos los tenants
Admin de Iglesia     → 1 iglesia + todas sus sedes + todo lo que contienen
  └─ Sede            → N sedes por iglesia
      └─ Ministerio  → N ministerios por sede
          └─ Líder   → puede liderar N ministerios (generalmente 1)
          └─ Servidor → puede pertenecer a N ministerios (generalmente 1)
```

### 3. Multi-tenancy: Híbrido JWT Claims + SQL Functions

**Enfoque elegido:** JWT Claims para verificaciones frecuentes (tenant_id, role), funciones SQL `SECURITY DEFINER` para reglas complejas (¿tiene acceso a este ministerio específico?).

**Estructura JWT `app_metadata` por rol:**

```json
// super_admin
{ "role": "super_admin", "tenant_id": null, "claims_at": 1746000000 }

// admin_iglesia
{ "role": "admin_iglesia", "tenant_id": 5, "claims_at": 1746000000 }

// lider
{ "role": "lider", "tenant_id": 5, "ministerio_ids": [12, 15], "claims_at": 1746000000 }

// servidor
{ "role": "servidor", "tenant_id": 5, "ministerio_ids": [12], "claims_at": 1746000000 }
```

### 4. Estrategia de caché JWT

- `usuario_rol` tendrá columna `permissions_updated_at TIMESTAMPTZ`.
- `AppContext` compara `DB.permissions_updated_at` contra `JWT.claims_at` al iniciar sesión.
- Si `permissions_updated_at > claims_at` → `supabase.auth.refreshSession()` automático antes de continuar.
- Para desactivar usuarios urgentemente: `supabase.auth.admin.signOut(userId)` desde service role.
- JWT expira en 1 hora → máximo 1h de claims stale si no hay refresh.

### 5. Cursos del Aula: mixtos (iglesia + ministerio)

- **Curso de iglesia:** `aula_curso.id_iglesia NOT NULL, id_ministerio NULL` — visible para todos los miembros de la iglesia.
- **Curso de ministerio:** `aula_curso.id_ministerio NOT NULL, id_iglesia NULL` — visible solo para miembros de ese ministerio.
- Constraint: exactamente uno de los dos debe estar presente `(id_ministerio IS NOT NULL) != (id_iglesia IS NOT NULL)`.

### 6. Rutas multi-tenant con tenant ID en URL

- `/app/global/*` — super_admin, sin tenant scope.
- `/app/:idIglesia/*` — rutas tenant-scoped.
- La URL es la fuente de verdad del tenant activo.
- `TenantLayout` valida que el usuario tenga acceso al `idIglesia` del parámetro de ruta.
- RLS en Supabase es segunda línea de defensa.

---

## Schema real (producción)

El schema real difiere del documento original `IGLESIABD_Supabase_Agent.md`. Las tablas reales son:

### Tablas existentes confirmadas

| Dominio | Tablas |
|---|---|
| Geografía | `pais`, `departamento`, `ciudad` (con `deleted_at`) |
| Iglesia | `iglesia`, `pastor`, `iglesia_pastor`, `sede`, `sede_pastor` |
| Ministerios | `ministerio`, `miembro_ministerio` |
| Usuarios | `rol`, `usuario` (con `auth_user_id`), `usuario_rol`, `notificacion` |
| Eventos/Tareas | `tipo_evento`, `evento`, `tarea` (con `id_ministerio`), `tarea_asignada`, `tarea_evidencia` |
| Aula (15 tablas) | `aula_curso`, `aula_modulo`, `aula_actividad`, `aula_evaluacion`, `aula_pregunta`, `aula_opcion`, `aula_respuesta`, `aula_intento_evaluacion`, `aula_progreso_actividad`, `aula_inscripcion`, `aula_certificado`, `aula_modulo_archivo`, `aula_modulo_enlace`, `aula_retroalimentacion` |
| Auditoría | `audit_log` |

**Nota:** Las tablas `curso`, `modulo`, `evaluacion`, `proceso_asignado_curso`, `detalle_proceso_curso` del documento original son **legacy** — el módulo Aula usa las tablas `aula_*`.

### Lo que ya está bien

- `deleted_at` (soft delete) en prácticamente todas las tablas.
- `audit_log` completo con IP, user_agent, valores anteriores/nuevos.
- `usuario.auth_user_id UUID REFERENCES auth.users(id)` ya existe.
- `tarea.id_ministerio` nullable ya existe.
- `usuario_rol.id_iglesia` nullable ya es el tenant key.
- `evento.id_iglesia NOT NULL` — eventos siempre escopados a un tenant.

---

## Gaps del schema que necesitan migración

### M1 — `aula_curso`: soporte cursos de iglesia (ALTA prioridad)

```sql
ALTER TABLE aula_curso
  ADD COLUMN id_iglesia bigint REFERENCES iglesia(id_iglesia);
ALTER TABLE aula_curso
  ALTER COLUMN id_ministerio DROP NOT NULL;
ALTER TABLE aula_curso
  ADD CONSTRAINT aula_curso_scope_check
  CHECK ((id_ministerio IS NOT NULL) != (id_iglesia IS NOT NULL));
CREATE INDEX idx_aula_curso_iglesia ON aula_curso(id_iglesia) WHERE id_iglesia IS NOT NULL;
```

### M2 — `tarea`: agregar `id_iglesia` para RLS eficiente (MEDIA prioridad)

Sin esta columna, la RLS requiere un join costoso `tarea → ministerio → sede → iglesia`.

```sql
ALTER TABLE tarea
  ADD COLUMN id_iglesia bigint REFERENCES iglesia(id_iglesia);

-- Backfill desde ministerio
UPDATE tarea t
SET id_iglesia = (
  SELECT s.id_iglesia
  FROM ministerio m
  JOIN sede s ON m.id_sede = s.id_sede
  WHERE m.id_ministerio = t.id_ministerio
)
WHERE id_ministerio IS NOT NULL AND id_iglesia IS NULL;

-- Para tareas con evento pero sin ministerio
UPDATE tarea t
SET id_iglesia = (
  SELECT e.id_iglesia FROM evento e WHERE e.id_evento = t.id_evento
)
WHERE id_evento IS NOT NULL AND id_iglesia IS NULL;

CREATE INDEX idx_tarea_iglesia ON tarea(id_iglesia) WHERE id_iglesia IS NOT NULL;
```

### M3 — `pastor`: agregar `id_iglesia` para RLS sin join (MEDIA prioridad)

```sql
ALTER TABLE pastor
  ADD COLUMN id_iglesia bigint REFERENCES iglesia(id_iglesia);

-- Backfill desde iglesia_pastor (iglesia principal)
UPDATE pastor p
SET id_iglesia = (
  SELECT ip.id_iglesia FROM iglesia_pastor ip
  WHERE ip.id_pastor = p.id_pastor AND ip.es_principal = true
  AND ip.fecha_fin IS NULL
  ORDER BY ip.fecha_inicio DESC LIMIT 1
)
WHERE id_iglesia IS NULL;
```

### M4 — `usuario_rol` y `aula_inscripcion`: columnas de soporte (MEDIA prioridad)

```sql
-- Cache invalidation
ALTER TABLE usuario_rol
  ADD COLUMN permissions_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION trigger_update_permissions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.permissions_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_permissions_updated_at
  BEFORE UPDATE ON usuario_rol
  FOR EACH ROW EXECUTE FUNCTION trigger_update_permissions_timestamp();

-- Soft delete consistente
ALTER TABLE aula_inscripcion
  ADD COLUMN deleted_at TIMESTAMPTZ;
```

---

## Funciones SQL para RLS (JWT Hybrid)

```sql
-- Tenant ID del usuario autenticado
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::bigint;
$$;

-- Rol del usuario autenticado
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$;

-- Verificar si es super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT get_my_role() = 'super_admin';
$$;

-- id_usuario local del usuario autenticado
CREATE OR REPLACE FUNCTION get_my_usuario_id()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT id_usuario FROM usuario WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- IDs de ministerios del usuario autenticado (activos)
CREATE OR REPLACE FUNCTION get_my_ministerios()
RETURNS TABLE(id bigint) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT id_ministerio
  FROM miembro_ministerio
  WHERE id_usuario = get_my_usuario_id()
    AND fecha_salida IS NULL;
$$;
```

---

## Matriz de permisos RLS por tabla

| Tabla | super_admin | admin_iglesia | lider | servidor |
|---|---|---|---|---|
| `iglesia` | ALL | SELECT su tenant | SELECT su tenant | SELECT su tenant |
| `sede` | ALL | ALL donde `id_iglesia = tenant` | SELECT su sede | SELECT su sede |
| `ministerio` | ALL | ALL en su iglesia | ALL sus ministerios | SELECT sus ministerios |
| `pastor` | ALL | ALL en su iglesia (`id_iglesia = tenant`) | SELECT su iglesia | — |
| `usuario` | ALL | ALL en su iglesia (via `usuario_rol`) | SELECT sus ministerios | SELECT propio |
| `evento` | ALL | ALL donde `id_iglesia = tenant` | ALL sus ministerios | SELECT sus ministerios |
| `tarea` | ALL | ALL donde `id_iglesia = tenant` | ALL sus ministerios | SELECT asignadas a él |
| `aula_curso` | ALL | ALL en su tenant (iglesia o ministerio) | ALL sus ministerios + iglesia | SELECT sus ministerios + iglesia |
| `aula_inscripcion` | ALL | ALL en su tenant | ALL sus ministerios | SELECT propio |
| `notificacion` | ALL | Solo propias | Solo propias | Solo propias |
| `pais/dpto/ciudad` | ALL | SELECT | SELECT | SELECT |
| `audit_log` | SELECT | — | — | — |

---

## Estructura de rutas

### Antes (actual)
```
/app → AppLayout
  /app → Dashboard
  /app/iglesias → ChurchesPage (super_admin)
  /app/sedes → SedesPage
  /app/pastores → PastoresPage (super_admin)
  /app/departamentos → DepartmentsPage
  /app/mi-departamento → MyDepartmentPage
  /app/miembros → MembersPage
  /app/eventos → EventsPage
  /app/tareas → TasksPage
  /app/aula → AulaPage
  /app/usuarios → UsuariosPage
  /app/geografia → GeographyPage
  /app/catalogos → CatalogosPage
```

### Después (multi-tenant)
```
/app → AppLayout (guard: autenticado)
  /app → IndexRedirect
         → super_admin: /app/global
         → otros: /app/:id_iglesia_del_jwt

/app/global → GlobalLayout (guard: solo super_admin)
  /app/global                  → Dashboard global (métricas de todas las iglesias)
  /app/global/iglesias         → CRUD todas las iglesias
  /app/global/administradores  → Gestión de usuarios con rol admin_iglesia (NUEVO)
  /app/global/usuarios         → Todos los usuarios
  /app/global/geografia        → CRUD países/departamentos/ciudades
  /app/global/catalogos        → Tipos de evento, etc.
  /app/global/notificaciones   → Notificaciones propias
  /app/global/perfil           → Mi perfil

/app/:idIglesia → TenantLayout (guard: tiene acceso a este tenant)
  /app/:idIglesia                              → Dashboard del tenant
  /app/:idIglesia/sedes                        → Sedes de la iglesia
  /app/:idIglesia/pastores                     → Pastores de la iglesia
  /app/:idIglesia/ministerios                  → Ministerios (era /departamentos)
  /app/:idIglesia/usuarios                     → Usuarios del tenant
  /app/:idIglesia/miembros                     → Miembros
  /app/:idIglesia/eventos                      → Eventos
  /app/:idIglesia/tareas                       → Tareas
  /app/:idIglesia/aula                         → Aula de Formación
  /app/:idIglesia/aula/curso/:idCurso          → Detalle del curso
  /app/:idIglesia/aula/curso/:idCurso/servidor/:idUsuario → Progreso individual
  /app/:idIglesia/mi-ministerio                → Mi ministerio (lider/servidor, era /mi-departamento)
  /app/:idIglesia/notificaciones               → Notificaciones
  /app/:idIglesia/perfil                       → Mi perfil
```

### TenantLayout — lógica de guard

```tsx
// TenantLayout.tsx
const { idIglesia } = useParams()
const { rolActual, iglesiaActual } = useApp()

if (rolActual === 'super_admin') → pasa siempre
if (Number(idIglesia) === iglesiaActual?.id) → pasa
else → navigate(`/app/${iglesiaActual?.id}`) // redirige a su tenant
```

---

## Navegación por rol

### super_admin — sección Global
- Dashboard global · Iglesias · Administradores · Usuarios · Geografía · Catálogos · Notificaciones · Mi Perfil

### admin_iglesia — sección Mi Iglesia + Operaciones + Formación
- Dashboard · Mi Iglesia · Sedes · Ministerios · Pastores · Usuarios · Miembros · Eventos · Tareas · Aula · Notificaciones · Mi Perfil

### lider — sección Mi Ministerio + Operaciones + Formación
- Dashboard · Mi Ministerio · Miembros · Eventos · Tareas · Aula · Notificaciones · Mi Perfil

### servidor — vista personal
- Dashboard · Mi Ministerio (lectura) · Eventos (lectura) · Mis Tareas (solo asignadas) · Aula · Notificaciones · Mi Perfil

---

## Cambios de nomenclatura en UI

| Elemento | Antes | Después |
|---|---|---|
| Badge de rol | "Admin. de Iglesia" | "Administrador de Iglesia" |
| Ruta `/app/departamentos` | "Ministerios" | `/app/:idIglesia/ministerios` |
| Ruta `/app/mi-departamento` | "Mi Ministerio" | `/app/:idIglesia/mi-ministerio` |
| Página super_admin pastores | Solo super_admin | super_admin + admin_iglesia (su iglesia) |
| Nueva página | — | `/app/global/administradores` — gestión de admin_iglesia |

---

## Bugs críticos a resolver (SP-1)

### Bug 1 — 403 en mutaciones de geografía
**Causa:** Falta política RLS de INSERT/UPDATE/DELETE en `pais`, `departamento`, `ciudad`.  
**Fix:** Agregar política para super_admin: `USING (is_super_admin()) WITH CHECK (is_super_admin())`.

### Bug 2 — 400 en lista de usuarios enriquecida
**Causa:** RLS de `usuario` bloquea el embed de `usuario_rol` + `miembro_ministerio`.  
**Fix:** Crear RPC `get_usuarios_by_iglesia(p_id_iglesia bigint)` con `SECURITY DEFINER` que devuelve la lista enriquecida solo si el caller es super_admin o admin de esa iglesia.

### Bug 3 — Creación de tareas rota
**Causa:** Script de usuario de prueba usa columnas inexistentes (`idUsuario` UUID en lugar de `id_usuario` serial). `auth_user_id` no vinculado correctamente.  
**Fix:** Corregir script de seed. Verificar que el trigger `handle_new_user()` crea correctamente el registro en `public.usuario` con `auth_user_id`.

### Bug 4 — Mock mode + sesión expirada → loop
**Causa:** `isAuthenticated: !!session` — si hay sesión expirada en localStorage, las peticiones fallan con 403 pero el sistema no hace logout.  
**Fix:** Detectar respuesta `UNAUTHORIZED` de `fetchUsuarioRaw` y forzar `supabase.auth.signOut()` + limpiar localStorage. Cambiar `isAuthenticated` a `!!session || isMockMode`.

---

## Sub-proyectos — orden de implementación

| ID | Nombre | Deps | Archivos principales afectados |
|---|---|---|---|
| SP-1 | Corrección de bugs críticos | — | `AppContext.tsx`, RLS geografía, seed scripts |
| SP-2 | Multi-tenancy + RLS estricta | SP-1 | Migraciones SQL, `AppContext.tsx`, `supabase/functions/` |
| SP-3 | Migración de esquema | SP-1 | 4 migraciones SQL (M1-M4) |
| SP-4 | Rutas multi-tenant + CRUDs | SP-2, SP-3 | `routes.ts`, `AppLayout.tsx`, todos los servicios y hooks, páginas nuevas |
| SP-5 | Aula multi-nivel | SP-3, SP-4 | `aula.service.ts`, `AulaPage.tsx`, `AdminAulaPage.tsx`, `LiderAulaPage.tsx` |

---

## Archivos clave a modificar por sub-proyecto

### SP-1
- `src/app/store/AppContext.tsx` — fix isAuthenticated + handle UNAUTHORIZED
- Supabase SQL Editor — políticas RLS geografía
- Scripts de seed

### SP-2
- Nueva migración SQL — funciones `get_my_tenant_id()`, `is_super_admin()`, `get_my_ministerios()`, `get_my_usuario_id()`
- Nueva migración SQL — trigger `set_tenant_claims()` + Edge Function para poblar `app_metadata`
- Nueva migración SQL — políticas RLS estrictas por tabla
- `src/app/store/AppContext.tsx` — comparar `claims_at` vs `permissions_updated_at`

### SP-3
- Migraciones SQL M1-M4

### SP-4
- `src/app/routes.ts` — nueva estructura completa
- `src/app/components/AppLayout.tsx` — navegación por rol actualizada
- `src/app/components/TenantLayout.tsx` — NUEVO guard de tenant
- `src/app/components/GlobalLayout.tsx` — NUEVO layout super_admin
- Todos los servicios (`*.service.ts`) — recibir `idIglesia` explícito
- Todos los hooks (`use*.ts`) — pasar `idIglesia` desde params
- `src/app/components/AdministradoresPage.tsx` — NUEVO
- Renombrar: `DepartmentsPage` → `MinisteriosPage`, `MyDepartmentPage` → `MiMinisterioPage`

### SP-5
- `src/services/aula.service.ts` — soporte cursos de iglesia vs ministerio
- `src/app/components/AdminAulaPage.tsx` — crear cursos de iglesia
- `src/app/components/LiderAulaPage.tsx` — crear cursos de ministerio
- `src/app/components/AulaPage.tsx` — mostrar ambos tipos diferenciados

---

## Consideraciones de seguridad

1. **RLS es la única fuente de verdad de autorización** — la UI puede fallar, la DB no debe devolver datos incorrectos.
2. **Funciones SQL con `SET search_path = public`** — previene ataques de search_path injection (ya detectado por Supabase advisor).
3. **Edge Function `invite-user`** — debe validar JWT del caller y resolver iglesia desde backend, nunca confiar en el payload del cliente.
4. **`super_admin` en RLS** — usar `USING (is_super_admin() OR <condición_normal>)` — el bypass es explícito.
5. **`audit_log`** — cada mutación sensible (cambio de rol, desactivar usuario, etc.) debe registrarse.
