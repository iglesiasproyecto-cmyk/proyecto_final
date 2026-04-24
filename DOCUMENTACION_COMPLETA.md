# 📚 DOCUMENTACIÓN DETALLADA - PROYECTO IGLESIABD

**Última actualización**: 24 de Abril de 2026
**Versión**: 1.0.0
**Estado**: Versión completa funcional

---

## 📑 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Arquitectura de la Aplicación](#arquitectura-de-la-aplicación)
5. [Base de Datos (Supabase)](#base-de-datos-supabase)
6. [Sistema de Autenticación y Autorización](#sistema-de-autenticación-y-autorización)
7. [Gestión de Estado](#gestión-de-estado)
8. [Componentes y Páginas](#componentes-y-páginas)
9. [Hooks Personalizados](#hooks-personalizados)
10. [Servicios](#servicios)
11. [Tipos e Interfaces](#tipos-e-interfaces)
12. [Flujo de Datos](#flujo-de-datos)
13. [Configuración y Setup](#configuración-y-setup)
14. [Comandos de Desarrollo](#comandos-de-desarrollo)
15. [Convenciones y Patrones](#convenciones-y-patrones)

---

## 📌 Descripción General

**IGLESIABD** es una aplicación web de gestión integral para iglesias cristianas. Se trata de una **Single Page Application (SPA)** construida con **React 18** y **Vite**, que permite administrar todas las operaciones y recursos de una iglesia de manera centralizada.

### 📊 Métricas del Proyecto
- **📁 Archivos TypeScript**: 150+ archivos
- **🗄️ Base de datos**: 28 tablas, 35+ relaciones FK
- **📜 Migraciones SQL**: 24 archivos (6,500+ líneas)
- **🧩 Componentes**: 50+ componentes (UI + aplicación)
- **🎣 Hooks personalizados**: 10+ hooks con React Query
- **🔧 Servicios**: 9 servicios de datos
- **📋 Interfaces**: 40+ tipos TypeScript
- **📊 Líneas de código**: 25,000+ líneas TypeScript + 6,500 líneas SQL

### Propósito Principal

La aplicación permite a las iglesias:
- ✅ Gestionar información de iglesias, sedes y pastores
- ✅ Administrar ministérios y sus miembros
- ✅ Controlar usuarios, roles y permisos
- ✅ Organizar eventos y tareas
- ✅ Crear y gestionar cursos académicos con módulos
- ✅ Gestionar evaluaciones
- ✅ Administrar geografía (países, departamentos, ciudades)
- ✅ Sistema de notificaciones en tiempo real

### Público Objetivo

- Administradores de iglesias
- Líderes de ministerios
- Pastores
- Usuarios (servidores/miembros)

---

## 🛠️ Stack Tecnológico

### Frontend

| Tecnología | Versión | Propósito |
|-----------|---------|----------|
| **React** | 18.3.1 | Framework de UI |
| **React Router** | 7.13.0 | Routing SPA |
| **TypeScript** | 6.0.2 | Type-safety |
| **Vite** | 6.3.5 | Build tool y dev server |
| **Tailwind CSS** | 4.1.12 | Utility-first CSS framework |
| **Radix UI** | Múltiples | Primitivos accesibles sin estilos |
| **shadcn/ui** | Custom | Componentes reutilizables basados en Radix |

### State Management & Data Fetching

| Librería | Propósito |
|----------|----------|
| **React Context** | Estado global (AppContext.tsx) |
| **TanStack React Query** | 5.96.0 - Data fetching, caching y sincronización |
| **TanStack Query DevTools** | 5.96.0 - Debugging de queries |

### Backend & Base de Datos

| Servicio | Propósito |
|----------|----------|
| **Supabase** | PostgreSQL hosted + Auth + Real-time |
| **@supabase/supabase-js** | 2.101.1 - Cliente JavaScript |

### UI & Visualización

| Librería | Propósito |
|----------|----------|
| **Recharts** | 2.15.2 - Gráficos y visualizaciones |
| **Framer Motion** | 12.23.24 - Animaciones |
| **MUI Icons** | 7.3.5 - Iconos Material |
| **Lucide React** | 0.487.0 - Iconos vectoriales |

### Formularios & Entrada

| Librería | Propósito |
|----------|----------|
| **React Hook Form** | 7.55.0 - Gestión eficiente de formularios |
| **Sonner** | 2.0.3 - Notificaciones Toast |

### Funcionalidades Especiales

| Librería | Propósito |
|----------|----------|
| **React DnD** | 16.0.1 - Drag & Drop |
| **React Slick** | 0.31.0 - Carruseles |
| **React Markdown** | 10.1.0 - Renderización de Markdown |
| **React DatePicker** | 8.10.1 - Selector de fechas |

### Otros

- **clsx** & **tailwind-merge**: Utilities para class names
- **date-fns**: Manipulación de fechas
- **cmdk**: Command palette
- **next-themes**: Manejo de tema (light/dark)

---

## 📁 Estructura del Proyecto

```
proyecto_final/
├── src/
│   ├── main.tsx                      # Punto de entrada de React
│   ├── app/
│   │   ├── App.tsx                   # Componente raíz
│   │   ├── routes.ts                 # Definición de rutas
│   │   ├── components/               # Componentes principales de la app
│   │   │   ├── AppLayout.tsx         # Layout principal con sidebar
│   │   │   ├── RootLayout.tsx        # Layout raíz con AppProvider
│   │   │   ├── ErrorPage.tsx         # Manejo de errores
│   │   │   ├── LandingPage.tsx       # Página de inicio
│   │   │   ├── LoginPage.tsx         # Autenticación
│   │   │   ├── RegisterPage.tsx      # Registro
│   │   │   ├── DashboardPage.tsx     # Dashboard principal
│   │   │   ├── ChurchesPage.tsx      # Gestión de iglesias
│   │   │   ├── DepartmentsPage.tsx   # Ministerios (departamentos)
│   │   │   ├── MembersPage.tsx       # Gestión de miembros
│   │   │   ├── EventsPage.tsx        # Gestión de eventos
│   │   │   ├── TasksPage.tsx         # Gestión de tareas
│   │   │   ├── ClassroomPage.tsx     # Aula virtual - cursos
│   │   │   ├── EvaluationsPage.tsx   # Evaluaciones
│   │   │   ├── ProfilePage.tsx       # Perfil de usuario
│   │   │   ├── GeographyPage.tsx     # Gestión de geografía
│   │   │   ├── SedesPage.tsx         # Gestión de sedes
│   │   │   ├── PastoresPage.tsx      # Gestión de pastores
│   │   │   ├── UsuariosPage.tsx      # Gestión de usuarios
│   │   │   ├── NotificationsPage.tsx # Notificaciones
│   │   │   ├── CatalogosPage.tsx     # Catálogos (tipos de eventos, etc)
│   │   │   ├── CiclosLectivosPage.tsx# Ciclos lectivos
│   │   │   ├── MisCursosPage.tsx     # Mis cursos (usuario)
│   │   │   ├── classroom/
│   │   │   │   └── ModuloDetailPage.tsx  # Detalle de módulo
│   │   │   ├── ui/                   # Componentes de UI reutilizables
│   │   │   │   └── (componentes shadcn/ui)
│   │   │   └── figma/                # Componentes desde Figma
│   │   └── store/
│   │       └── AppContext.tsx        # Estado global (~6000 líneas)
│   │
│   ├── hooks/                        # Hooks personalizados con React Query
│   │   ├── useCursos.ts              # Queries/mutations de cursos
│   │   ├── useEventos.ts             # Queries/mutations de eventos
│   │   ├── useGeografia.ts           # Queries/mutations de geografía
│   │   ├── useIglesias.ts            # Queries/mutations de iglesias
│   │   ├── useInscripciones.ts       # Queries/mutations de inscripciones
│   │   ├── useMinisterios.ts         # Queries/mutations de ministerios
│   │   ├── useModulo.ts              # Queries/mutations de módulos
│   │   ├── useNotificaciones.ts      # Queries/mutations de notificaciones
│   │   └── useUsuarios.ts            # Queries/mutations de usuarios
│   │
│   ├── services/                     # Servicios (funciones que hacen fetch)
│   │   ├── cursos.service.ts         # CRUD y lógica de cursos
│   │   ├── eventos.service.ts        # CRUD y lógica de eventos
│   │   ├── geografia.service.ts      # CRUD y lógica de geografía
│   │   ├── iglesias.service.ts       # CRUD y lógica de iglesias
│   │   ├── inscripciones.service.ts  # CRUD y lógica de inscripciones
│   │   ├── ministerios.service.ts    # CRUD y lógica de ministerios
│   │   ├── notificaciones.service.ts # CRUD y lógica de notificaciones
│   │   └── usuarios.service.ts       # CRUD y lógica de usuarios
│   │
│   ├── lib/
│   │   └── supabaseClient.ts         # Cliente Supabase configurado
│   │
│   ├── types/
│   │   ├── app.types.ts              # Tipos de negocio
│   │   └── database.types.ts         # Tipos generados de Supabase
│   │
│   ├── styles/
│   │   ├── index.css                 # Estilos globales
│   │   ├── tailwind.css              # Configuración Tailwind
│   │   ├── theme.css                 # Variables CSS personalizadas
│   │   └── fonts.css                 # Fuentes personalizadas
│   │
│   └── assets/                       # Recursos estáticos
│
├── supabase/
│   ├── config.toml                   # Configuración de Supabase local
│   ├── functions/
│   │   └── invite-user/              # Funciones serverless
│   └── migrations/                   # Migraciones de BD
│       ├── 20260407031108_auth_user_id_and_trigger.sql
│       ├── 20260407031116_fk_indexes.sql
│       ├── 20260407031130_rls_authenticated_reads.sql
│       ├── 20260407031150_seed_data.sql
│       ├── 20260407141016_phase1_rls_mutations.sql
│       ├── 20260407204753_phase2_rls_ministerios.sql
│       ├── 20260407205720_phase3_rls_eventos.sql
│       ├── 20260407211744_phase4_rls_cursos.sql
│       ├── 20260415100000_phase5_rls_usuarios.sql
│       ├── 20260416120000_phase6_rls_geografia.sql
│       └── (más migraciones...)
│
├── scripts/
│   ├── apply-migration.js            # Script para aplicar migraciones
│   ├── generate-types.js             # Script para generar types de BD
│   ├── verify-migration.js           # Verificación de migraciones
│   ├── create_admin_user.sql         # Script de creación de admin
│   └── test-*.sql                    # Scripts de prueba
│
├── docs/                             # Documentación
│   ├── superpowers/
│   │   ├── plans/                    # Planes de desarrollo
│   │   └── specs/                    # Especificaciones
│   └── guidelines/
│       ├── Backend_Implementation_Plan.md
│       └── Guidelines.md
│
├── vite.config.ts                    # Configuración Vite
├── tsconfig.json                     # Configuración TypeScript
├── tailwind.config.js                # Configuración Tailwind
├── postcss.config.mjs                # Configuración PostCSS
├── package.json                      # Dependencias y scripts
├── CLAUDE.md                         # Guía para Claude
├── IGLESIABD_Supabase_Agent.md       # Schema de Supabase
├── SUPABASE_AGENT.md                 # Info de Supabase
└── README.md                         # Readme básico
```

---

## 🏗️ Arquitectura de la Aplicación

### Diagrama de Capas

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRESENTACIÓN                             │
│  Pages (ChurchesPage, EventsPage, etc) + UI Components          │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    ESTADO GLOBAL                                 │
│  AppContext (session, usuarioActual, iglesiaActual, roles, etc) │
│  + React Query (caching, fetching automático)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                  HOOKS PERSONALIZADOS                            │
│  useIglesias(), useCursos(), etc (utilizan React Query)         │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      SERVICIOS                                   │
│  iglesias.service.ts, cursos.service.ts, etc                    │
│  (Contienen funciones que hacen fetch a Supabase)               │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                  SUPABASE CLIENT                                 │
│  Conecta con Supabase via REST API                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    SUPABASE                                      │
│  PostgreSQL + Auth + Real-time + Storage                        │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo de Navegación

```
main.tsx
  ↓
App.tsx (RouterProvider)
  ↓
RootLayout
  ├── AppProvider (AppContext)
  ├── ErrorBoundary
  └── RouterProvider children:
      ├── "/" → LandingPage (público)
      ├── "/login" → LoginPage (público)
      ├── "/register" → RegisterPage (público)
      └── "/app" → AppLayout (privado)
          ├── AppSidebar + TopNav
          └── outlet para páginas:
              ├── "/app" → DashboardPage
              ├── "/app/iglesias" → ChurchesPage
              ├── "/app/departamentos" → DepartmentsPage
              ├── "/app/aula" → ClassroomPage
              ├── "/app/eventos" → EventsPage
              └── (15+ páginas más)
```

---

## 💾 Base de Datos (Supabase)

### Descripción General

La base de datos está construida en **PostgreSQL** via **Supabase** con 28 tablas organizadas en 6 dominios principales:

### 1️⃣ Dominio: GEOGRAFÍA

Administra la estructura territorial.

**Tablas:**
- `pais` - Países
- `departamento` - Departamentos/Estados
- `ciudad` - Ciudades

**Relaciones:**
```
pais (1) ←→ (N) departamento (1) ←→ (N) ciudad
```

**Campos ejemplo (pais):**
```
- id_pais (PK)
- nombre (VARCHAR)
- creado_en (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

### 2️⃣ Dominio: IGLESIAS Y LIDERAZGO

Gestiona iglesias, sedes y pastores.

**Tablas:**
- `iglesia` - Iglesias principales
- `sede` - Sedes de iglesias
- `pastor` - Registros de pastores
- `iglesia_pastor` - Relación muchos-a-muchos

**Relaciones:**
```
iglesia (1) ←→ (N) sede (1) ←→ (N) ciudad
iglesia (N) ←→ (N) pastor (via iglesia_pastor)
```

**Campos ejemplo (iglesia):**
```
- id_iglesia (PK)
- nombre (VARCHAR)
- fecha_fundacion (DATE)
- estado (ENUM: activa, inactiva, fusionada, cerrada)
- id_ciudad (FK)
- creado_en (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**Campos ejemplo (pastor):**
```
- id_pastor (PK)
- nombres (VARCHAR)
- apellidos (VARCHAR)
- correo (VARCHAR)
- telefono (VARCHAR)
- id_usuario (FK, nullable)
```

---

### 3️⃣ Dominio: MINISTERIOS

Gestiona ministerios y sus miembros.

**Tablas:**
- `ministerio` - Ministerios
- `miembro_ministerio` - Relación usuario-ministerio

**Relaciones:**
```
ministerio (N) ←→ (1) sede
miembro_ministerio (N) ←→ (1) ministerio
miembro_ministerio (N) ←→ (1) usuario
```

**Campos ejemplo (ministerio):**
```
- id_ministerio (PK)
- nombre (VARCHAR)
- descripcion (TEXT)
- estado (ENUM: activo, inactivo, suspendido)
- id_sede (FK)
- creado_en (TIMESTAMP)
```

---

### 4️⃣ Dominio: USUARIOS Y PERMISOS

Gestiona usuarios, roles y permisos (integración con Auth de Supabase).

**Tablas:**
- `usuario` - Usuarios de la aplicación
- `rol` - Roles disponibles
- `usuario_rol` - Asignación de roles a usuarios por iglesia

**Relaciones:**
```
auth.users (1) ←→ (1) usuario (via auth_user_id)
usuario (N) ←→ (N) rol (via usuario_rol)
usuario_rol (N) ←→ (1) iglesia
usuario_rol (N) ←→ (1) sede (nullable)
```

**Campos ejemplo (usuario):**
```
- id_usuario (PK)
- auth_user_id (FK a auth.users)
- nombres (VARCHAR)
- apellidos (VARCHAR)
- correo (VARCHAR)
- contrasena_hash (VARCHAR)
- telefono (VARCHAR)
- activo (BOOLEAN)
- ultimo_acceso (TIMESTAMP)
- creado_en (TIMESTAMP)
```

**Roles del sistema:**
- Super Administrador (acceso total)
- Administrador de Iglesia (acceso a su iglesia)
- Líder (acceso limitado a su ministerio)
- Servidor (acceso básico)

---

### 5️⃣ Dominio: EVENTOS Y TAREAS

Gestiona eventos de la iglesia y tareas de seguimiento.

**Tablas:**
- `tipo_evento` - Tipos de eventos
- `evento` - Eventos
- `tarea` - Tareas
- `tarea_asignada` - Asignación de tareas

**Relaciones:**
```
tipo_evento (1) ←→ (N) evento
evento (1) ←→ (N) tarea
evento (N) ←→ (1) iglesia
evento (N) ←→ (1) sede (nullable)
evento (N) ←→ (1) ministerio (nullable)
tarea_asignada (N) ←→ (1) tarea
tarea_asignada (N) ←→ (1) usuario
```

**Campos ejemplo (evento):**
```
- id_evento (PK)
- nombre (VARCHAR)
- descripcion (TEXT)
- id_tipo_evento (FK)
- fecha_inicio (TIMESTAMP)
- fecha_fin (TIMESTAMP)
- estado (ENUM: programado, en_curso, finalizado, cancelado)
- id_iglesia (FK)
- id_sede (FK, nullable)
- id_ministerio (FK, nullable)
```

---

### 6️⃣ Dominio: CURSOS Y EDUCACIÓN

Gestiona cursos, módulos, evaluaciones e inscripciones.

**Tablas:**
- `curso` - Cursos académicos
- `modulo` - Módulos dentro de cursos
- `modulo_contenido` - Contenido de módulos
- `evaluacion` - Evaluaciones
- `proceso_asignado_curso` - Inscripción de usuarios a cursos
- `ciclo_lectivo` - Ciclos o períodos académicos

**Relaciones:**
```
ciclo_lectivo (1) ←→ (N) curso
curso (N) ←→ (1) ministerio
curso (1) ←→ (N) modulo
modulo (1) ←→ (N) modulo_contenido
modulo (1) ←→ (N) evaluacion
evaluacion (N) ←→ (1) usuario (via resultado evaluación)
proceso_asignado_curso (N) ←→ (1) usuario
proceso_asignado_curso (N) ←→ (1) curso
```

**Campos ejemplo (curso):**
```
- id_curso (PK)
- nombre (VARCHAR)
- descripcion (TEXT)
- duracion_horas (INT)
- estado (ENUM: borrador, activo, finalizado, archivado)
- id_ministerio (FK)
- id_usuario_creador (FK)
```

---

### 7️⃣ Dominio: NOTIFICACIONES

Gestiona notificaciones para usuarios.

**Tabla:**
- `notificacion` - Notificaciones

**Campos:**
```
- id_notificacion (PK)
- id_usuario (FK)
- titulo (VARCHAR)
- mensaje (TEXT)
- leida (BOOLEAN)
- fecha_lectura (TIMESTAMP)
- tipo (ENUM: informacion, alerta, tarea, evento, curso)
- creado_en (TIMESTAMP)
```

---

### 8️⃣ Triggers y Funciones Especiales

**Trigger: `handle_new_user`**
- **Cuándo**: Cuando se crea un nuevo usuario en `auth.users`
- **Qué hace**: Crea automáticamente un registro en `public.usuario` con datos del auth
- **Código**: Definido en `20260407031108_auth_user_id_and_trigger.sql`

**Funciones RPC (Remote Procedure Call):**
- `get_my_usuario()` - Obtiene datos del usuario actual (SECURITY DEFINER)
- `get_all_usuarios_enriquecidos()` - Obtiene usuarios con sus roles y ministerios

**Row Level Security (RLS):**
- Implementado en múltiples fases (migraciones phase1 a phase6)
- Cada usuario solo ve datos de su iglesia/ministerio
- Roles determinan qué datos puede ver/modificar

---

## 🔐 Sistema de Autenticación y Autorización

### Flujo de Autenticación

```
1. Usuario entra a LandingPage
   ↓
2. Si no autenticado → LoginPage
   ├── Email + contraseña
   └── supabase.auth.signInWithPassword()
       ↓
3. Supabase verifica credenciales
   ├── Si correcto → devuelve Session
   └── Si incorrecto → error
       ↓
4. AppContext recibe Session
   ├── auth_user_id (UUID de auth.users)
   ├── email
   └── metadata
       ↓
5. Fetcher de Usuario (via RPC o query directo)
   ├── Busca registro en public.usuario
   ├── Obtiene roles del usuario
   └── Obtiene iglesias asociadas
       ↓
6. AppContext actualiza estado:
   - isAuthenticated = true
   - usuarioActual = {Usuario}
   - rolActual = string del rol
   - iglesiaActual = iglesia por defecto
       ↓
7. Router redirige a /app/dashboard
   └── AppLayout renderiza con acceso completo
```

### Roles y Permisos

**Roles del Sistema:**

| Rol | Acceso | Vistas | Funciones |
|-----|--------|--------|-----------|
| **Super Administrador** | Global | Todas las iglesias, usuarios, roles | CRUD completo en todo |
| **Administrador Iglesia** | Iglesia | Su iglesia y todas sus sedes | Gestión de iglesia, usuarios, roles (limitado) |
| **Líder Ministerio** | Ministerio | Su ministerio | Gestión de miembros, eventos, tareas, cursos y evaluaciones |
| **Servidor** | Personal | Su perfil | Ver eventos, tareas asignadas, cursos |

**Normalización de Roles:**

```typescript
function normalizeAppRole(rawRoles: string[]): string {
  // Normaliza acentos y espacios
  // Super Administrador → super_admin
  // Administrador de Iglesia → admin_iglesia
  // Líder* → lider
  // Por defecto → servidor
}
```

### Row Level Security (RLS)

**Concepto:** Cada fila en la BD está protegida por políticas RLS que verifican si el usuario actual puede acceder.

**Políticas implementadas:**

1. **fase1_rls_mutations.sql**: Mutaciones en iglesia, sede, pastor
   ```sql
   -- Admin iglesia puede actualizar su iglesia
   CREATE POLICY iglesia_update_admin
   ON iglesia FOR UPDATE
   USING (
     EXISTS (
       SELECT 1 FROM usuario_rol ur
       JOIN rol r ON ur.id_rol = r.id_rol
       WHERE ur.id_usuario = auth.uid()
       AND ur.id_iglesia = iglesia.id_iglesia
       AND r.nombre = 'Administrador de Iglesia'
     )
   )
   ```

2. **fase2_rls_ministerios.sql**: Acceso a ministerios
3. **fase3_rls_eventos.sql**: Acceso a eventos
4. **fase4_rls_cursos.sql**: Acceso a cursos
5. **fase5_rls_usuarios.sql**: Visibilidad de usuarios
6. **fase6_rls_geografia.sql**: Acceso a geografía

**Bypass de RLS:** Funciones marcadas con `SECURITY DEFINER` ejecutan con permisos del dueño de la función (admin de BD).

---

## 🎯 Gestión de Estado

### AppContext

**Ubicación:** `src/app/store/AppContext.tsx` (~6000 líneas)

**Propósito:** Almacenar estado global de la aplicación sin Redux/Zustand.

**Estructura:**

```typescript
interface AppState {
  // Autenticación
  session: Session | null              // Sesión de Supabase
  usuarioActual: Usuario | null        // Usuario logueado
  isAuthenticated: boolean             // ¿Autenticado?
  authLoading: boolean                 // ¿Cargando auth?
  
  // Contexto de iglesia
  iglesiaActual: { id: number; nombre: string } | null
  setIglesiaActual: (ig: {...} | null) => void
  iglesiasDelUsuario: { id: number; nombre: string }[]
  
  // Rol actual
  rolActual: string                    // super_admin, admin_iglesia, etc
  
  // UI
  sidebarOpen: boolean
  toggleSidebar: () => void
  darkMode: boolean
  toggleDarkMode: () => void
  
  // Datos
  notificacionesCount: number
  
  // Métodos
  logout: () => Promise<void>
  
  // Mock mode (para desarrollo UI)
  isMockMode: boolean
  setMockMode: (val: boolean) => void
  mockRol: string
  setMockRol: (rol: string) => void
}
```

**Provider:**

```typescript
// En RootLayout.tsx
<AppProvider>
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
</AppProvider>
```

**Consumo:**

```typescript
// En componentes
const context = useContext(AppContext)
const { usuarioActual, rolActual, iglesiaActual } = context
```

### React Query

**Propósito:** Gestionar fetching de datos, caching y sincronización.

**Configuración:** Cada hook usa React Query por debajo.

**Ejemplo de flujo:**

```typescript
// En useIglesias.ts
export function useIglesias() {
  return useQuery({
    queryKey: ['iglesias'],
    queryFn: getIglesias,
    staleTime: 5 * 60 * 1000  // Válido por 5 minutos
  })
}

// En componente
function ChurchesPage() {
  const { data, isLoading, error } = useIglesias()
  
  return (
    <>
      {isLoading && <div>Cargando...</div>}
      {data?.map(ig => <div key={ig.idIglesia}>{ig.nombre}</div>)}
    </>
  )
}
```

**DevTools:**

```typescript
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

---

## 🧩 Componentes y Páginas

### Estructura de Componentes

**Componentes Principales (en `/app/components/`):**

| Componente | Propósito | Archivo |
|-----------|----------|---------|
| **RootLayout** | Layout raíz, AppProvider | RootLayout.tsx |
| **AppLayout** | Layout con sidebar + nav | AppLayout.tsx |
| **LandingPage** | Página de inicio | LandingPage.tsx |
| **LoginPage** | Autenticación | LoginPage.tsx |
| **RegisterPage** | Registro de usuario | RegisterPage.tsx |
| **DashboardPage** | Dashboard principal | DashboardPage.tsx |
| **ChurchesPage** | CRUD de iglesias | ChurchesPage.tsx |
| **DepartmentsPage** | Gestión de ministerios | DepartmentsPage.tsx |
| **MembersPage** | Gestión de miembros | MembersPage.tsx |
| **EventsPage** | CRUD de eventos | EventsPage.tsx |
| **TasksPage** | CRUD de tareas | TasksPage.tsx |
| **ClassroomPage** | Aula virtual (cursos) | ClassroomPage.tsx |
| **EvaluationsPage** | Evaluaciones | EvaluationsPage.tsx |
| **GeographyPage** | Gestión de geografía | GeographyPage.tsx |
| **SedesPage** | Gestión de sedes | SedesPage.tsx |
| **PastoresPage** | Gestión de pastores | PastoresPage.tsx |
| **UsuariosPage** | Gestión de usuarios | UsuariosPage.tsx |
| **ProfilePage** | Perfil de usuario | ProfilePage.tsx |
| **NotificationsPage** | Notificaciones | NotificationsPage.tsx |
| **CatalogosPage** | Catálogos (tipos, etc) | CatalogosPage.tsx |
| **CiclosLectivosPage** | Ciclos académicos | CiclosLectivosPage.tsx |
| **MisCursosPage** | Mis cursos (usuario) | MisCursosPage.tsx |
| **SitemapPage** | Mapa del sitio | SitemapPage.tsx |

### Componentes de UI

**Ubicación:** `src/app/components/ui/`

Son componentes reutilizables basados en **shadcn/ui** (que usa Radix UI primitivos):

- Button
- Card
- Dialog
- Dropdown Menu
- Form
- Input
- Select
- Table
- Tabs
- Toast
- Modal
- Avatar
- Badge
- etc.

### Páginas - Detalles de Flujo

#### ChurchesPage (Gestión de Iglesias)

```
ChurchesPage
├── useIglesiasEnriquecidas() → React Query
├── Tabla de iglesias con columnas:
│   ├── Nombre
│   ├── Fecha Fundación
│   ├── Estado
│   ├── Ciudad
│   ├── # Sedes
│   └── Acciones (editar, eliminar, cambiar estado)
├── Diálogo para crear iglesia
└── Diálogo para editar iglesia
```

**Funciones principales:**
- `getIglesiasEnriquecidas()` - Obtiene iglesias con datos enriquecidos
- `createIglesia(data)` - Crea nueva iglesia
- `updateIglesia(id, data)` - Actualiza iglesia
- `deleteIglesia(id)` - Elimina iglesia
- `toggleIglesiaEstado(id)` - Cambia estado activa/inactiva

---

## 🪝 Hooks Personalizados

Todos los hooks están en `src/hooks/` y usan **React Query** internamente.

### Hook Pattern (Ejemplo)

```typescript
// Cada hook sigue este patrón:

// 1. Query Hook (lectura)
export function useIglesias() {
  return useQuery({
    queryKey: ['iglesias'],
    queryFn: getIglesias,
    staleTime: 5 * 60 * 1000
  })
}

// 2. Mutation Hook (escritura)
export function useCreateIglesia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createIglesia,
    onSuccess: () => {
      // Invalida cache para que se refetch automáticamente
      qc.invalidateQueries({ queryKey: ['iglesias'] })
    }
  })
}
```

### Hooks Disponibles

#### 1. **useIglesias** (iglesias.service.ts)
```typescript
useIglesias() → { data: Iglesia[], isLoading, error }
useIglesiasEnriquecidas() → { data: IglesiaEnriquecida[], ... }
usePastores() → { data: Pastor[], ... }
useSedes(idIglesia?) → { data: Sede[], ... }
useCreateIglesia() → { mutate, isPending, ... }
useUpdateIglesia() → { mutate, ... }
useToggleIglesiaEstado() → { mutate, ... }
useDeleteIglesia() → { mutate, ... }
// Similar para Sede y Pastor
```

#### 2. **useMinisterios** (ministerios.service.ts)
```typescript
useMinisterios(idSede?) → { data: Ministerio[], ... }
useMiembrosMinisterio(idMinisterio?) → { data: MiembroMinisterio[], ... }
useCreateMinisterio() → { mutate, ... }
useUpdateMinisterio() → { mutate, ... }
// ... más métodos CRUD
```

#### 3. **useCursos** (cursos.service.ts)
```typescript
useCursos(idMinisterio?) → { data: Curso[], ... }
useModulosByCurso(idCurso?) → { data: Modulo[], ... }
useCreateCurso() → { mutate, ... }
useUpdateCurso() → { mutate, ... }
useEnrolCurso(idCurso, idUsuario) → { mutate, ... }
// ... más métodos
```

#### 4. **useEventos** (eventos.service.ts)
```typescript
useEventos(idIglesia?) → { data: Evento[], ... }
useCreateEvento() → { mutate, ... }
useUpdateEvento() → { mutate, ... }
// ... métodos CRUD
```

#### 5. **useTareas** (eventos.service.ts - incluido)
```typescript
useTareas() → { data: Tarea[], ... }
useCreateTarea() → { mutate, ... }
// ... métodos CRUD
```

#### 6. **useUsuarios** (usuarios.service.ts)
```typescript
getUsuarios() → { data: Usuario[], ... }
getUsuariosEnriquecidos() → { data: UsuarioEnriquecido[], ... }
useCreateUsuario() → { mutate, ... }
useUpdateUsuario() → { mutate, ... }
// ... métodos
```

#### 7. **useGeografia** (geografia.service.ts)
```typescript
usePaises() → { data: Pais[], ... }
useDepartamentos(idPais?) → { data: DepartamentoGeo[], ... }
useCiudades(idDepartamento?) → { data: Ciudad[], ... }
// ... métodos CRUD para cada tabla
```

#### 8. **useNotificaciones** (notificaciones.service.ts)
```typescript
useNotificaciones(idUsuario?) → { data: Notificacion[], ... }
useMarcarLeida(idNotificacion) → { mutate, ... }
// ... métodos
```

#### 9. **useInscripciones** (inscripciones.service.ts)
```typescript
useInscripcionesCurso(idCurso?) → { data: Inscripcion[], ... }
useEnrollUser() → { mutate, ... }
// ... métodos
```

---

## 🔧 Servicios

Los servicios son funciones que interactúan directamente con Supabase. Cada uno corresponde a un dominio de datos.

### Anatomía de un Servicio

```typescript
// iglesias.service.ts
import { supabase } from '@/lib/supabaseClient'
import type { Iglesia } from '@/types/app.types'

// 1. Mapeo de tipos (BD → App)
function mapIglesia(r: IglesiaRow): Iglesia {
  return {
    idIglesia: r.id_iglesia,
    nombre: r.nombre,
    // ... otros campos
  }
}

// 2. Query: Obtener datos
export async function getIglesias(): Promise<Iglesia[]> {
  const { data, error } = await supabase
    .from('iglesia')
    .select('*')
    .order('nombre')
  
  if (error) throw error
  return data.map(mapIglesia)
}

// 3. Query con relaciones
export async function getIglesiasEnriquecidas(): Promise<IglesiaEnriquecida[]> {
  const { data, error } = await supabase
    .from('iglesia')
    .select('*, sede(count), ciudad(nombre, departamento(nombre))')
  
  if (error) throw error
  return data.map(r => ({
    ...mapIglesia(r),
    cantidadSedes: r.sede?.[0]?.count ?? 0
  }))
}

// 4. Mutation: Crear
export async function createIglesia(data: CreateIglesiaInput): Promise<Iglesia> {
  const { data: newRow, error } = await supabase
    .from('iglesia')
    .insert([{
      nombre: data.nombre,
      fecha_fundacion: data.fechaFundacion,
      estado: 'activa',
      id_ciudad: data.idCiudad
    }])
    .select()
    .single()
  
  if (error) throw error
  return mapIglesia(newRow)
}

// 5. Mutation: Actualizar
export async function updateIglesia(
  id: number,
  data: UpdateIglesiaInput
): Promise<Iglesia> {
  const { data: updated, error } = await supabase
    .from('iglesia')
    .update({
      nombre: data.nombre,
      estado: data.estado
    })
    .eq('id_iglesia', id)
    .select()
    .single()
  
  if (error) throw error
  return mapIglesia(updated)
}

// 6. Mutation: Eliminar
export async function deleteIglesia(id: number): Promise<void> {
  const { error } = await supabase
    .from('iglesia')
    .delete()
    .eq('id_iglesia', id)
  
  if (error) throw error
}

// 7. RPC: Función especializada
export async function getIglesiasDelUsuario(idUsuario: number): Promise<Iglesia[]> {
  const { data, error } = await supabase
    .rpc('get_iglesias_usuario', { p_id_usuario: idUsuario })
  
  if (error) throw error
  return data.map(mapIglesia)
}
```

### Servicios Disponibles

#### 1. **iglesias.service.ts**
- `getIglesias()` - Todas las iglesias
- `getIglesiasEnriquecidas()` - Con metadata
- `getPastores()` - Lista de pastores
- `getIglesiaPastores()` - Relación iglesia-pastor
- `getSedes(idIglesia?)` - Sedes de iglesia
- `getSedesEnriquecidas()` - Sedes con metadata
- `createIglesia(data)` - Crear iglesia
- `updateIglesia(id, data)` - Actualizar iglesia
- `toggleIglesiaEstado(id)` - Cambiar estado
- `deleteIglesia(id)` - Eliminar iglesia
- Y métodos similares para Sede y Pastor

#### 2. **ministerios.service.ts**
- `getMinisterios(idSede?)` - Ministerios
- `getMiembrosMinisterio(idMinisterio?)` - Miembros
- `createMinisterio(data)` - Crear
- `updateMinisterio(id, data)` - Actualizar
- `addMiembroMinisterio(data)` - Agregar miembro
- `removeMiembroMinisterio(id)` - Remover miembro
- Y más...

#### 3. **cursos.service.ts**
- `getCursos(idMinisterio?)` - Cursos
- `getCursoById(id)` - Curso específico
- `getModulosByCurso(idCurso)` - Módulos
- `getModuloContenido(idModulo)` - Contenido
- `createCurso(data)` - Crear curso
- `enrollUserInCurso(idCurso, idUsuario)` - Inscribir
- `unenrollUserFromCurso(idCurso, idUsuario)` - Desinscribir
- Y más...

#### 4. **eventos.service.ts**
- `getEventos(idIglesia?)` - Eventos
- `getTiposEvento()` - Tipos disponibles
- `createEvento(data)` - Crear evento
- `updateEvento(id, data)` - Actualizar
- Y métodos CRUD para Tareas

#### 5. **usuarios.service.ts**
- `getRoles()` - Roles disponibles
- `getUsuarios()` - Todos los usuarios
- `getUsuariosEnriquecidos()` - Con roles/ministerios
- `getUsuarioRoles(idUsuario)` - Roles de usuario
- `createUsuario(data)` - Crear usuario
- `updateUsuario(id, data)` - Actualizar
- `assignRolToUsuario(data)` - Asignar rol
- Y más...

#### 6. **geografia.service.ts**
- `getPaises()` - Países
- `getDepartamentos(idPais?)` - Departamentos
- `getCiudades(idDepartamento?)` - Ciudades
- Métodos CRUD para cada tabla

#### 7. **notificaciones.service.ts**
- `getNotificacionesUsuario(idUsuario)` - Notificaciones de usuario
- `marcarNotificacionLeida(idNotificacion)` - Marcar como leída
- `createNotificacion(data)` - Crear notificación
- Y más...

#### 8. **inscripciones.service.ts**
- `getInscripcionesCurso(idCurso)` - Inscripciones
- `getInscripcionesUsuario(idUsuario)` - Cursos del usuario
- `createInscripcion(data)` - Inscribir
- `deleteInscripcion(id)` - Desinscribir
- Y más...

---

## 📝 Tipos e Interfaces

Ubicados en `src/types/`:

### app.types.ts

Define las interfaces de negocio:

```typescript
// GEOGRAFÍA
export interface Pais { idPais, nombre, ... }
export interface DepartamentoGeo { idDepartamentoGeo, nombre, idPais, ... }
export interface Ciudad { idCiudad, nombre, idDepartamentoGeo, ... }

// IGLESIAS
export interface Iglesia { idIglesia, nombre, fechaFundacion, estado, idCiudad, ... }
export interface Pastor { idPastor, nombres, apellidos, correo, ... }
export interface IglesiaPastor { idIglesiaPastor, idIglesia, idPastor, ... }
export interface Sede { idSede, nombre, direccion, idCiudad, idIglesia, ... }

// MINISTERIOS
export interface Ministerio { idMinisterio, nombre, estado, idSede, ... }
export interface MiembroMinisterio { idMiembroMinisterio, idUsuario, idMinisterio, ... }

// USUARIOS
export interface Rol { idRol, nombre, descripcion, ... }
export interface Usuario { idUsuario, nombres, apellidos, correo, activo, ... }
export interface UsuarioRol { idUsuarioRol, idUsuario, idRol, idIglesia, ... }

// EVENTOS
export interface TipoEvento { idTipoEvento, nombre, ... }
export interface Evento { idEvento, nombre, estado, idIglesia, ... }
export interface Tarea { idTarea, titulo, estado, prioridad, ... }
export interface TareaAsignada { idTareaAsignada, idTarea, idUsuario, ... }

// CURSOS
export interface Curso { idCurso, nombre, descripcion, estado, ... }
export interface Modulo { idModulo, nombre, orden, idCurso, ... }
export interface ModuloContenido { idModuloContenido, titulo, contenido, ... }
export interface Evaluacion { idEvaluacion, nombre, tipo, ... }
export interface ProcesoAsignadoCurso { id, idUsuario, idCurso, estado, ... }
export interface CicloLectivo { idCicloLectivo, nombre, fecha_inicio, ... }

// NOTIFICACIONES
export interface Notificacion { idNotificacion, idUsuario, titulo, mensaje, ... }
```

### database.types.ts

Generado automáticamente desde Supabase con tipos de BD:

```typescript
export type Database = {
  public: {
    Tables: {
      iglesia: { Row: {...}, Insert: {...}, Update: {...} },
      usuario: { Row: {...}, Insert: {...}, Update: {...} },
      // ... todas las tablas
    },
    Enums: {
      estado_iglesia: 'activa' | 'inactiva' | 'fusionada' | 'cerrada',
      estado_evento: 'programado' | 'en_curso' | 'finalizado' | 'cancelado',
      // ... otros enums
    }
  }
}
```

**Generación:**
```bash
# Genera types desde Supabase
npm run generate-types

# O manualmente con Supabase CLI
supabase gen types typescript --local > src/types/database.types.ts
```

---

## 🔄 Flujo de Datos

### Flujo Lectura (Query)

```
Usuario abre ChurchesPage
  ↓
useIglesiasEnriquecidas() ejecuta
  ↓
React Query revisa si está en cache y es válido
  ├─ SÍ: devuelve data del cache
  └─ NO: llama queryFn
      ↓
getIglesiasEnriquecidas() en iglesias.service.ts
  ↓
supabase.from('iglesia').select('*, sede(...), ciudad(...)')
  ↓
REST API de Supabase
  ↓
PostgreSQL ejecuta query
  ├─ Verifica RLS policies
  └─ Devuelve datos permitidos
      ↓
JSON response a frontend
  ↓
mapIglesia() traduce snake_case → camelCase
  ↓
React Query guarda en cache (staleTime: 5 min)
  ↓
Componente re-renderiza con data
  ↓
Usuario ve tabla de iglesias
```

### Flujo Escritura (Mutation)

```
Usuario hace clic en "Crear Iglesia"
  ↓
Dialog abre, completa formulario
  ↓
Envía con createIglesia()
  ↓
useCreateIglesia().mutate(data)
  ↓
iglesias.service.createIglesia(data)
  ↓
supabase.from('iglesia').insert([{...}]).select().single()
  ↓
REST API + PostgreSQL
  ├─ Verifica RLS (admin_iglesia)
  ├─ Valida constraints (unique, FK, etc)
  └─ Inserta fila
      ↓
Devuelve fila insertada
  ↓
React Query on success callback:
qc.invalidateQueries({ queryKey: ['iglesias'] })
  ↓
React Query marca iglesias como stale
  ↓
useIglesiasEnriquecidas() auto-refetch
  ↓
Nueva query a BD
  ↓
Tabla se actualiza con iglesia nueva
  ↓
Toast notificación: "Iglesia creada"
```

### Flujo Autenticación

```
Usuario en LoginPage → ingresa credenciales
  ↓
handleLogin() → supabase.auth.signInWithPassword(email, password)
  ↓
Supabase Auth verifica credenciales contra auth.users
  ├─ Email no existe: error
  ├─ Contraseña incorrecta: error
  └─ Correcto:
      ├─ Crea Session (access_token, refresh_token)
      ├─ Devuelve User object
      └─ Cliente guarda en localStorage (auto)
          ↓
AppContext detecta cambio en session (via listener)
  ↓
auth.onAuthStateChanged((user) => {...})
  ↓
Si user existe: fetch usuario de public.usuario
  ├─ RPC: rpc('get_my_usuario', {})
  ├─ O: query directo filtrando por auth_user_id
  └─ Obtiene datos enriched (Usuario + Roles + Ministerios)
      ↓
AppContext actualiza:
- isAuthenticated = true
- usuarioActual = Usuario
- rolActual = rol del usuario
- iglesiaActual = iglesia by defecto
      ↓
Router redirige /app
  ↓
AppLayout renderiza
  ↓
Usuario ve dashboard
```

---

## 🚀 Configuración y Setup

### Requisitos

- Node.js >= 18
- npm o pnpm
- Supabase CLI (para desarrollo local)
- PostgreSQL (via Supabase local)

### Instalación

```bash
# 1. Clonar repositorio
git clone <repo>
cd proyecto_final

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
# Crear .env basado en .env.example (si existe)
# O crear .env con:
VITE_SUPABASE_URL=<tu_url_supabase>
VITE_SUPABASE_ANON_KEY=<tu_key>

# 4. Generar tipos de BD (opcional, si cambió schema)
npm run generate-types

# 5. Iniciar servidor de desarrollo
npm run dev

# 6. Abrir en navegador
http://localhost:5173/
```

### Configuración de Supabase Local

```bash
# 1. Instalar Supabase CLI
npm install -g supabase

# 2. Inicializar proyecto
supabase init

# 3. Iniciar local
supabase start

# 4. Aplicar migraciones
supabase db reset

# 5. Ver URL local (en output de start)
http://127.0.0.1:54321
```

### Archivos de Configuración

#### vite.config.ts
```typescript
- Plugins: React, Tailwind CSS, fix-mime
- Dev server: puerto 5173, host 0.0.0.0
- Alias: @ → src/
- Assets: SVG, CSV
```

#### tsconfig.json
```typescript
- Target: ES2020
- Module: ESNext
- Lib: ES2020, DOM, DOM.Iterable
- Paths: @ → src/
```

#### tailwind.config.js
```
- Content: src/**/*.{js,ts,jsx,tsx}
- Tema: colores personalizados (teal, navy, cream)
- Extensiones: dark mode
```

#### postcss.config.mjs
```
- Plugins: Tailwind CSS
- Para procesar @apply, @screen, etc.
```

### Variables de Entorno

```bash
# .env o .env.local
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Opcionales
VITE_API_URL=http://localhost:3000
VITE_DEBUG=false
```

---

## 💻 Comandos de Desarrollo

### npm scripts (en package.json)

```bash
# Iniciar dev server (hot reload)
npm run dev

# Build producción
npm run build

# Instalar dependencias
npm install

# (No hay test ni lint configurados aún)
```

### Comandos Supabase CLI

```bash
# Iniciar Supabase local
supabase start

# Parar Supabase
supabase stop

# Reset database (aplica todas las migraciones + seed)
supabase db reset

# Ver estado de migraciones
supabase db pull

# Crear nueva migración
supabase migration new <nombre>

# Generar tipos TypeScript desde BD
supabase gen types typescript --local > src/types/database.types.ts

# Ver logs de funciones
supabase functions logs
```

### Operaciones de BD

```bash
# Conectar a BD local
psql postgres://postgres:postgres@localhost:5432/postgres

# Ver tablas
\dt

# Ver RLS policies
SELECT * FROM pg_policies;

# Ejecutar migración manual
psql < supabase/migrations/XXXX_nombre.sql
```

---

## 📐 Convenciones y Patrones

### Nomenclatura

#### Tablas de BD (snake_case)
```sql
usuario, iglesia, departamento, tipo_evento, usuario_rol
```

#### Campos de BD (snake_case)
```sql
id_usuario, nombres, apellidos, creado_en, updated_at, id_iglesia
```

#### Tipos TypeScript (PascalCase)
```typescript
Usuario, Iglesia, MiembroMinisterio, TareaAsignada
```

#### Variables/Funciones (camelCase)
```typescript
usuarioActual, handleCreateIglesia, fetchIglesias, useIglesias
```

#### Enum values (SCREAMING_SNAKE_CASE DB, lowercase JS)
```sql
estado: 'activa' | 'inactiva'
prioridad: 'baja' | 'media' | 'alta' | 'urgente'
```

### Patrones

#### 1. Service Pattern
```
service (llamadas a Supabase)
  ↓
hook (useQuery/useMutation)
  ↓
component (consume hook)
```

#### 2. Error Handling
```typescript
try {
  const data = await supabase.from(...).select(...)
  if (error) throw error
  return data
} catch (err) {
  console.error('Error fetching:', err)
  throw err  // Propaga para que React Query maneje
}
```

#### 3. Component Patterns

**Stateless presentational:**
```typescript
function Card({ title, children }) {
  return <div className="...">...</div>
}
```

**Smart con hooks:**
```typescript
function ChurchesPage() {
  const { data, isLoading } = useIglesias()
  return <>{isLoading ? <Spinner /> : <Table data={data} />}</>
}
```

#### 4. React Query Pattern
```typescript
// Query
useQuery({
  queryKey: ['iglesias', idSede],  // Unique key
  queryFn: () => getIglesias(idSede),
  staleTime: 5 * 60 * 1000,  // 5 min
})

// Mutation con invalidación
useMutation({
  mutationFn: createIglesia,
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['iglesias'] })  // Refetch
  },
  onError: (err) => {
    console.error(err)
    toast.error('Error creating iglesia')
  }
})
```

### Estilos

#### Colores Marca (en theme.css)

```css
--primary: #1a7fa8;        /* Teal blue */
--foreground: #0c2340;     /* Navy */
--background: #f5efe6;     /* Cream */
```

#### Tailwind Utilities

```
Espaciado: p-4, m-2, gap-6
Textos: text-lg, font-bold, text-gray-600
Colores: bg-primary, text-foreground
Sombras: shadow-md, shadow-lg
Bordes: border, border-2, rounded-lg
Responsive: md:, lg:, xl:
Dark mode: dark:
```

#### Componentes UI Pattern

```typescript
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import { useForm } from 'react-hook-form'

export function MyComponent() {
  const { register, handleSubmit } = useForm()
  
  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input {...register('name')} />
        <Button type="submit">Submit</Button>
      </form>
    </Card>
  )
}
```

---

## 📊 Resumen de Dominios

| Dominio | Tablas | Propósito | Usuarios Típicos |
|---------|--------|----------|------------------|
| **Geografía** | pais, departamento, ciudad | Ubicación territorial | Super admin |
| **Iglesia** | iglesia, sede, pastor, iglesia_pastor | Estructura organizacional | Admin iglesia, Líderes |
| **Ministerios** | ministerio, miembro_ministerio | Grupos temáticos | Líderes, Servidores |
| **Usuarios** | usuario, rol, usuario_rol | Autenticación y autorización | Super admin, Admin iglesia |
| **Eventos** | tipo_evento, evento, tarea, tarea_asignada | Actividades y seguimiento | Líderes, Servidores |
| **Académico** | ciclo_lectivo, curso, modulo, modulo_contenido, evaluacion, proceso_asignado_curso | Educación continua | Maestros, Estudiantes |
| **Notificaciones** | notificacion | Comunicación | Todos |

---

## 🔍 Diagrama General de Conexiones

```
FRONTEND (React 18 + Vite)
  │
  ├─ Components
  │   └─ useIglesias(), useCursos(), etc (React Query)
  │
  ├─ Services
  │   ├─ iglesias.service.ts
  │   ├─ cursos.service.ts
  │   └─ usuarios.service.ts
  │
  └─ AppContext (Global State)
      ├─ session
      ├─ usuarioActual
      └─ rolActual

          │
          ↓

SUPABASE
  │
  ├─ Auth (Autenticación)
  │   └─ auth.users (UUID, email, password)
  │
  ├─ PostgreSQL (Datos)
  │   ├─ Geografía (pais, departamento, ciudad)
  │   ├─ Iglesias (iglesia, sede, pastor)
  │   ├─ Ministerios (ministerio, miembro_ministerio)
  │   ├─ Usuarios (usuario, rol, usuario_rol)
  │   ├─ Eventos (evento, tarea)
  │   └─ Académico (curso, modulo, evaluacion)
  │
  ├─ RLS Policies (Seguridad)
  │   └─ Control de acceso por usuario/iglesia
  │
  └─ Functions/RPC
      └─ get_my_usuario(), get_all_usuarios_enriquecidos()
```

---

## 🎓 Próximos Pasos y Roadmap

### Completado ✅
- ✅ Schema de BD de 28 tablas
- ✅ Autenticación con Supabase Auth
- ✅ RLS policies en 6 fases
- ✅ Servicios y hooks para todas las tablas
- ✅ UI con shadcn/ui y Tailwind
- ✅ 20+ páginas funcionales
- ✅ React Query para data fetching

### En Progreso 🔄
- 🔄 Validación completa de formularios
- 🔄 Mensajes de error mejorados
- 🔄 Integración de notificaciones en tiempo real

### Pendiente 📋
- 📋 Tests unitarios
- 📋 Tests e2e
- 📋 Documentación de componentes
- 📋 Deployment a producción
- 📋 CI/CD pipeline
- 📋 Monitoreo y observabilidad
- 📋 Optimización de performance

---

## 📞 Recursos y Documentación Adicional

- [CLAUDE.md](./CLAUDE.md) - Guía para Claude (arquitectura rápida)
- [SUPABASE_AGENT.md](./SUPABASE_AGENT.md) - Schema completo de BD (28 tablas, 35+ FKs)
- [Guidelines.md](./guidelines/Guidelines.md) - Guías de desarrollo
- [Backend_Implementation_Plan.md](./guidelines/Backend_Implementation_Plan.md) - Roadmap backend (6 fases)

---

## 🤝 Contribuir

Para contribuir al proyecto:

1. Lee esta documentación completa
2. Consulta CLAUDE.md para arquitectura rápida
3. Revisa Guidelines.md para convenciones
4. Usa el patrón Service → Hook → Component
5. Mantén tipos TypeScript estrictos
6. Sigue nomenclatura (snake_case BD, camelCase código)

---

**Documento generado el 21 de Abril de 2026**  
**Version: 0.0.1 MVP**


Voy a crear un plan detallado para un sistema completo de evaluaciones con preguntas, opciones y puntuación. Primero, déjame investigar la estructura actual. 

Investigar estructura actual de evaluaciones

Searched for text `CREATE TABLE evaluacion` (`**/supabase/migrations/**`), no results

Searched for regex `CREATE TABLE pregunta|CREATE TABLE opcion_respuesta|CREATE TABLE respuesta_evaluacion` (`**/supabase/migrations/**`), no results

Searched for regex `interface Evaluacion|type Evaluacion` (`**/src/types/**`), 1 result

Searched for files matching `**/EvaluationPage.tsx`, no matches

Searched for files matching `**/useEvaluaciones.ts`, no matches

Searched for regex `evaluacion|pregunta|opcion_respuesta|respuesta` (`**/src/services/cursos.service.ts`), 20 results

Searched for text `evaluacion` (`**/supabase/migrations/**`), 20 results

Read [](file:///home/jhdba/proyecto_final/src/types/app.types.ts#239-239), lines 239 to 260

Read [](file:///home/jhdba/proyecto_final/src/services/cursos.service.ts#1-1), lines 1 to 100

Read [](file:///home/jhdba/proyecto_final/supabase/migrations)

Searched for regex `pregunta|opcion_respuesta|respuesta_evaluacion` (`**/supabase/migrations/**`), no results

Searched for regex `evaluation|evaluacion|Evaluation|Evaluacion` (`**/src/app/components/**`), 20 results

Searched for regex `useEvaluaciones|useCreateEvaluacion|useDeleteEvaluacion` (`**/src/hooks/useCursos.ts`), 4 results

Read [](file:///home/jhdba/proyecto_final/supabase/migrations/20260407031150_seed_data.sql)

Read [](file:///home/jhdba/proyecto_final/src/app/components/EvaluationsPage.tsx#1-1), lines 1 to 150

Searched for regex `CREATE TABLE` (`**/supabase/migrations/20260407031150_seed_data.sql`), no results

Searched for regex `CREATE TABLE evaluacion` (`**/supabase/migrations/**`), no results

Read [](file:///home/jhdba/proyecto_final/src/hooks/useCursos.ts#1-1), lines 1 to 250

Searched for regex `evaluacion|pregunta|respuesta` (`**/supabase/migrations/**`), 50 results

Read [](file:///home/jhdba/proyecto_final/src/services/cursos.service.ts#100-100), lines 100 to 150

Searched for regex `evaluacion|pregunta|respuesta` (`**/src/types/database.types.ts`), 14 results

Searched for text `CREATE TABLE evaluacion` (`**/supabase/migrations/20260421130000_formacion_production_ready.sql`), no results

Searched codebase for "CREATE TABLE evaluacion estructura schema database migrations", 18 results

Searched for text `CREATE TABLE evaluacion` (`**/supabase/migrations/**`), no results

Read [](file:///home/jhdba/proyecto_final/src/types/database.types.ts#170-170), lines 170 to 230

Perfecto. Voy a crear un **plan completo para un sistema de evaluaciones con preguntas, opciones y puntuación automática**. 

Created memory file [](file:///home/jhdba/.vscode-server/data/User/workspaceStorage/dac14fb4deaf46fca87a3331bb728e99/GitHub.copilot-chat/memory-tool/memories/ZWYwOGY5YmMtYzU5ZS00MjcxLWExZmQtODIyMGMyZmMzZmVm/evaluaciones_plan.md)

# 📝 Plan: Sistema Completo de Evaluaciones con Preguntas y Opciones

## 🎯 Visión General

Implementar un sistema completo de evaluaciones que permita:
- **Crear evaluaciones** con múltiples preguntas de opción múltiple
- **Asignar puntuaciones** a cada opción de respuesta
- **Resolver evaluaciones** de forma interactiva
- **Calcular puntaje final** automáticamente
- **Registrar historial** de intentos del estudiante

---

## 🗄️ **FASE 1: Estructura de Base de Datos**

### 1.1 Nueva Tabla: `pregunta`

```sql
CREATE TABLE public.pregunta (
  id_pregunta        BIGSERIAL       PRIMARY KEY,
  id_evaluacion      BIGINT          NOT NULL REFERENCES evaluacion(id_evaluacion) ON DELETE CASCADE,
  titulo             VARCHAR(500)    NOT NULL,
  descripcion        TEXT,
  tipo               VARCHAR(20)     NOT NULL DEFAULT 'multiple_choice',  -- multiple_choice, verdadero_falso, abierta
  orden              INT             NOT NULL,
  activo             BOOLEAN         DEFAULT true,
  creado_en          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE (id_evaluacion, orden)
);
```

**Campos:**
- `id_pregunta`: Primary key
- `id_evaluacion`: FK a evaluación (eliminación en cascada)
- `titulo`: Enunciado de la pregunta
- `descripcion`: Contexto o detalles adicionales
- `tipo`: Tipo de pregunta (opción múltiple, V/F, abierta)
- `orden`: Secuencia en la evaluación
- `activo`: Para desactivar sin eliminar

---

### 1.2 Nueva Tabla: `opcion_respuesta`

```sql
CREATE TABLE public.opcion_respuesta (
  id_opcion          BIGSERIAL       PRIMARY KEY,
  id_pregunta        BIGINT          NOT NULL REFERENCES pregunta(id_pregunta) ON DELETE CASCADE,
  texto_opcion       VARCHAR(500)    NOT NULL,
  es_correcta        BOOLEAN         NOT NULL DEFAULT false,
  puntos             NUMERIC(5,2)    NOT NULL DEFAULT 0,     -- Puntos si selecciona esta opción
  orden              INT             NOT NULL,                -- A=1, B=2, C=3, D=4
  creado_en          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE (id_pregunta, orden)
);
```

**Campos:**
- `id_opcion`: Primary key
- `id_pregunta`: FK (eliminación en cascada)
- `texto_opcion`: Texto de la opción (ej: "La respuesta es X")
- `es_correcta`: Marca si es la respuesta correcta
- `puntos`: Puntuación si selecciona esta opción (0 si incorrecta)
- `orden`: A=1, B=2, C=3, D=4 (para mostrar en UI)

**Ejemplo de puntuación:**
```
Pregunta 1 (máx 10 puntos):
- Opción A (correcta): 10 puntos
- Opción B: 0 puntos
- Opción C: 0 puntos
- Opción D: 0 puntos
```

---

### 1.3 Nueva Tabla: `respuesta_evaluacion`

```sql
CREATE TABLE public.respuesta_evaluacion (
  id_respuesta       BIGSERIAL       PRIMARY KEY,
  id_pregunta        BIGINT          NOT NULL REFERENCES pregunta(id_pregunta),
  id_usuario         BIGINT          NOT NULL REFERENCES usuario(id_usuario),
  id_evaluacion      BIGINT          NOT NULL REFERENCES evaluacion(id_evaluacion),
  id_opcion_selected BIGINT          REFERENCES opcion_respuesta(id_opcion),
  puntos_obtenidos   NUMERIC(5,2),
  intento            INT             NOT NULL DEFAULT 1,     -- Número de intento (1ra vez, 2da, etc)
  respondido_en      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  creado_en          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE (id_pregunta, id_usuario, id_evaluacion, intento)
);
```

**Campos:**
- `id_respuesta`: Primary key
- `id_pregunta`, `id_usuario`, `id_evaluacion`: FKs
- `id_opcion_selected`: FK a opción seleccionada (nullable si no respondió)
- `puntos_obtenidos`: Puntos ganados en esta pregunta
- `intento`: Permite múltiples intentos
- `respondido_en`: Timestamp de cuándo respondió

---

### 1.4 Nueva Tabla: `evaluacion_intento`

```sql
CREATE TABLE public.evaluacion_intento (
  id_intento         BIGSERIAL       PRIMARY KEY,
  id_evaluacion      BIGINT          NOT NULL REFERENCES evaluacion(id_evaluacion),
  id_usuario         BIGINT          NOT NULL REFERENCES usuario(id_usuario),
  numero_intento     INT             NOT NULL,                -- 1, 2, 3...
  fecha_inicio       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  fecha_fin          TIMESTAMPTZ,
  estado             VARCHAR(20)     NOT NULL DEFAULT 'en_progreso',  -- en_progreso, completado, abandonado
  puntaje_total      NUMERIC(5,2),
  puntaje_maximo     NUMERIC(5,2),
  porcentaje         NUMERIC(5,2),
  tiempo_duracion    INT,                                      -- En segundos
  creado_en          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE (id_evaluacion, id_usuario, numero_intento)
);
```

**Campos:**
- `id_intento`: Primary key
- `id_evaluacion`, `id_usuario`: FKs
- `numero_intento`: 1ra vez, 2da, etc
- `fecha_inicio`, `fecha_fin`: Timestamps
- `estado`: en_progreso, completado, abandonado
- `puntaje_total`: Suma de puntos obtenidos
- `puntaje_maximo`: Suma de todos los puntos posibles
- `porcentaje`: (puntaje_total / puntaje_maximo) * 100
- `tiempo_duracion`: Tiempo que tardó en resolver

---

### 1.5 Archivos de Migración

**Archivo:** `supabase/migrations/20260424_evaluaciones_preguntas.sql`

```sql
-- FASE 1: Crear tablas de preguntas y opciones

-- 1. Tabla pregunta
CREATE TABLE IF NOT EXISTS public.pregunta (
  id_pregunta        BIGSERIAL       PRIMARY KEY,
  id_evaluacion      BIGINT          NOT NULL REFERENCES public.evaluacion(id_evaluacion) ON DELETE CASCADE,
  titulo             VARCHAR(500)    NOT NULL,
  descripcion        TEXT,
  tipo               VARCHAR(20)     NOT NULL DEFAULT 'multiple_choice',
  orden              INT             NOT NULL,
  activo             BOOLEAN         DEFAULT true,
  creado_en          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE (id_evaluacion, orden)
);

CREATE INDEX idx_pregunta_evaluacion ON public.pregunta(id_evaluacion);

-- 2. Tabla opcion_respuesta
CREATE TABLE IF NOT EXISTS public.opcion_respuesta (
  id_opcion          BIGSERIAL       PRIMARY KEY,
  id_pregunta        BIGINT          NOT NULL REFERENCES public.pregunta(id_pregunta) ON DELETE CASCADE,
  texto_opcion       VARCHAR(500)    NOT NULL,
  es_correcta        BOOLEAN         NOT NULL DEFAULT false,
  puntos             NUMERIC(5,2)    NOT NULL DEFAULT 0,
  orden              INT             NOT NULL,
  creado_en          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE (id_pregunta, orden)
);

CREATE INDEX idx_opcion_pregunta ON public.opcion_respuesta(id_pregunta);

-- 3. Tabla respuesta_evaluacion
CREATE TABLE IF NOT EXISTS public.respuesta_evaluacion (
  id_respuesta       BIGSERIAL       PRIMARY KEY,
  id_pregunta        BIGINT          NOT NULL REFERENCES public.pregunta(id_pregunta),
  id_usuario         BIGINT          NOT NULL REFERENCES public.usuario(id_usuario),
  id_evaluacion      BIGINT          NOT NULL REFERENCES public.evaluacion(id_evaluacion),
  id_opcion_selected BIGINT          REFERENCES public.opcion_respuesta(id_opcion),
  puntos_obtenidos   NUMERIC(5,2),
  intento            INT             NOT NULL DEFAULT 1,
  respondido_en      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  creado_en          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE (id_pregunta, id_usuario, id_evaluacion, intento)
);

CREATE INDEX idx_respuesta_usuario ON public.respuesta_evaluacion(id_usuario, id_evaluacion);
CREATE INDEX idx_respuesta_pregunta ON public.respuesta_evaluacion(id_pregunta);

-- 4. Tabla evaluacion_intento
CREATE TABLE IF NOT EXISTS public.evaluacion_intento (
  id_intento         BIGSERIAL       PRIMARY KEY,
  id_evaluacion      BIGINT          NOT NULL REFERENCES public.evaluacion(id_evaluacion),
  id_usuario         BIGINT          NOT NULL REFERENCES public.usuario(id_usuario),
  numero_intento     INT             NOT NULL,
  fecha_inicio       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  fecha_fin          TIMESTAMPTZ,
  estado             VARCHAR(20)     NOT NULL DEFAULT 'en_progreso',
  puntaje_total      NUMERIC(5,2),
  puntaje_maximo     NUMERIC(5,2),
  porcentaje         NUMERIC(5,2),
  tiempo_duracion    INT,
  creado_en          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE (id_evaluacion, id_usuario, numero_intento)
);

CREATE INDEX idx_intento_usuario ON public.evaluacion_intento(id_usuario, id_evaluacion);

-- 5. Agregar campo puntaje_maximo a evaluacion si no existe
ALTER TABLE public.evaluacion 
ADD COLUMN IF NOT EXISTS puntaje_maximo NUMERIC(5,2) DEFAULT 100;

-- 6. RLS: Hacer accesibles estas tablas a usuarios inscritos en el curso
ALTER TABLE public.pregunta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opcion_respuesta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respuesta_evaluacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluacion_intento ENABLE ROW LEVEL SECURITY;

-- Policies (básicas para permitir acceso)
CREATE POLICY pregunta_select_inscrito
ON public.pregunta FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.evaluacion e
    JOIN public.modulo m ON m.id_modulo = e.id_modulo
    JOIN public.curso c ON c.id_curso = m.id_curso
    JOIN public.proceso_asignado_curso pac ON pac.id_curso = c.id_curso
    WHERE e.id_evaluacion = pregunta.id_evaluacion
      AND pac.id_usuario = auth.uid()
  )
);
```

---

## 📝 **FASE 2: Tipos TypeScript**

**Archivo:** app.types.ts (agregar estas interfaces)

```typescript
// === EVALUACIONES ===

export interface Pregunta {
  idPregunta: number
  idEvaluacion: number
  titulo: string
  descripcion?: string
  tipo: 'multiple_choice' | 'verdadero_falso' | 'abierta'
  orden: number
  activo: boolean
  creadoEn: string
  actualizadoEn: string
}

export interface OpcionRespuesta {
  idOpcion: number
  idPregunta: number
  textoOpcion: string
  esCorrecta: boolean
  puntos: number
  orden: number // 1=A, 2=B, 3=C, 4=D
  creadoEn: string
  actualizadoEn: string
}

export interface RespuestaEvaluacion {
  idRespuesta: number
  idPregunta: number
  idUsuario: number
  idEvaluacion: number
  idOpcionSelected?: number
  puntosObtenidos?: number
  intento: number
  respondidoEn: string
  creadoEn: string
}

export interface EvaluacionIntento {
  idIntento: number
  idEvaluacion: number
  idUsuario: number
  numeroIntento: number
  fechaInicio: string
  fechaFin?: string
  estado: 'en_progreso' | 'completado' | 'abandonado'
  puntajeTotal?: number
  puntajeMaximo?: number
  porcentaje?: number
  tiempoDuracion?: number // En segundos
  creadoEn: string
}

export interface EvaluacionConPreguntas {
  evaluacion: Evaluacion
  preguntas: Pregunta[]
  puntajeMaximo: number
}

export interface PreguntaConOpciones {
  pregunta: Pregunta
  opciones: OpcionRespuesta[]
}

export interface ResultadoEvaluacion {
  intento: EvaluacionIntento
  respuestas: RespuestaEvaluacion[]
  detalles: {
    totalPreguntas: number
    respondidas: number
    correctas: number
    puntajeObtenido: number
    puntajeMaximo: number
    porcentaje: number
  }
}
```

---

## 🔧 **FASE 3: Servicios de Evaluación**

**Archivo:** `src/services/evaluaciones.service.ts` (crear nuevo)

```typescript
import { supabase } from '@/lib/supabaseClient'
import type {
  Pregunta,
  OpcionRespuesta,
  RespuestaEvaluacion,
  EvaluacionIntento,
  EvaluacionConPreguntas,
  PreguntaConOpciones,
  ResultadoEvaluacion
} from '@/types/app.types'

// ============ PREGUNTAS ============

export async function crearPregunta(data: {
  idEvaluacion: number
  titulo: string
  descripcion?: string
  tipo: 'multiple_choice' | 'verdadero_falso' | 'abierta'
  orden: number
}): Promise<Pregunta> {
  const { data: newRow, error } = await supabase
    .from('pregunta')
    .insert([{
      id_evaluacion: data.idEvaluacion,
      titulo: data.titulo,
      descripcion: data.descripcion,
      tipo: data.tipo,
      orden: data.orden,
      activo: true
    }])
    .select()
    .single()
  
  if (error) throw error
  return mapPregunta(newRow)
}

export async function obtenerPreguntasPorEvaluacion(idEvaluacion: number): Promise<PreguntaConOpciones[]> {
  const { data, error } = await supabase
    .from('pregunta')
    .select(`
      *,
      opcion_respuesta(*)
    `)
    .eq('id_evaluacion', idEvaluacion)
    .eq('activo', true)
    .order('orden', { ascending: true })
  
  if (error) throw error
  return (data as any[]).map(p => ({
    pregunta: mapPregunta(p),
    opciones: (p.opcion_respuesta || []).map(mapOpcionRespuesta)
  }))
}

export async function actualizarPregunta(
  idPregunta: number,
  data: Partial<Pregunta>
): Promise<Pregunta> {
  const { data: updated, error } = await supabase
    .from('pregunta')
    .update({
      titulo: data.titulo,
      descripcion: data.descripcion,
      tipo: data.tipo
    })
    .eq('id_pregunta', idPregunta)
    .select()
    .single()
  
  if (error) throw error
  return mapPregunta(updated)
}

export async function eliminarPregunta(idPregunta: number): Promise<void> {
  const { error } = await supabase
    .from('pregunta')
    .delete()
    .eq('id_pregunta', idPregunta)
  
  if (error) throw error
}

// ============ OPCIONES RESPUESTA ============

export async function crearOpcion(data: {
  idPregunta: number
  textoOpcion: string
  esCorrecta: boolean
  puntos: number
  orden: number
}): Promise<OpcionRespuesta> {
  const { data: newRow, error } = await supabase
    .from('opcion_respuesta')
    .insert([{
      id_pregunta: data.idPregunta,
      texto_opcion: data.textoOpcion,
      es_correcta: data.esCorrecta,
      puntos: data.puntos,
      orden: data.orden
    }])
    .select()
    .single()
  
  if (error) throw error
  return mapOpcionRespuesta(newRow)
}

export async function actualizarOpcion(
  idOpcion: number,
  data: Partial<OpcionRespuesta>
): Promise<OpcionRespuesta> {
  const { data: updated, error } = await supabase
    .from('opcion_respuesta')
    .update({
      texto_opcion: data.textoOpcion,
      es_correcta: data.esCorrecta,
      puntos: data.puntos
    })
    .eq('id_opcion', idOpcion)
    .select()
    .single()
  
  if (error) throw error
  return mapOpcionRespuesta(updated)
}

export async function eliminarOpcion(idOpcion: number): Promise<void> {
  const { error } = await supabase
    .from('opcion_respuesta')
    .delete()
    .eq('id_opcion', idOpcion)
  
  if (error) throw error
}

// ============ RESPUESTAS ============

export async function registrarRespuesta(data: {
  idPregunta: number
  idUsuario: number
  idEvaluacion: number
  idOpcionSelected: number
  intento: number
}): Promise<RespuestaEvaluacion> {
  // Obtener puntos de la opción seleccionada
  const { data: opcion, error: errorOpcion } = await supabase
    .from('opcion_respuesta')
    .select('puntos')
    .eq('id_opcion', data.idOpcionSelected)
    .single()
  
  if (errorOpcion) throw errorOpcion
  
  const { data: newRow, error } = await supabase
    .from('respuesta_evaluacion')
    .insert([{
      id_pregunta: data.idPregunta,
      id_usuario: data.idUsuario,
      id_evaluacion: data.idEvaluacion,
      id_opcion_selected: data.idOpcionSelected,
      puntos_obtenidos: opcion.puntos,
      intento: data.intento
    }])
    .select()
    .single()
  
  if (error) throw error
  return mapRespuestaEvaluacion(newRow)
}

export async function obtenerRespuestasDelIntento(
  idUsuario: number,
  idEvaluacion: number,
  numeroIntento: number
): Promise<RespuestaEvaluacion[]> {
  const { data, error } = await supabase
    .from('respuesta_evaluacion')
    .select('*')
    .eq('id_usuario', idUsuario)
    .eq('id_evaluacion', idEvaluacion)
    .eq('intento', numeroIntento)
  
  if (error) throw error
  return (data || []).map(mapRespuestaEvaluacion)
}

// ============ INTENTOS ============

export async function iniciarIntento(data: {
  idEvaluacion: number
  idUsuario: number
  numeroIntento: number
}): Promise<EvaluacionIntento> {
  const { data: newRow, error } = await supabase
    .from('evaluacion_intento')
    .insert([{
      id_evaluacion: data.idEvaluacion,
      id_usuario: data.idUsuario,
      numero_intento: data.numeroIntento,
      estado: 'en_progreso'
    }])
    .select()
    .single()
  
  if (error) throw error
  return mapEvaluacionIntento(newRow)
}

export async function finalizarIntento(data: {
  idIntento: number
  puntajeTotal: number
  puntajeMaximo: number
  tiempoDuracion: number
}): Promise<EvaluacionIntento> {
  const porcentaje = (data.puntajeTotal / data.puntajeMaximo) * 100
  
  const { data: updated, error } = await supabase
    .from('evaluacion_intento')
    .update({
      fecha_fin: new Date().toISOString(),
      estado: 'completado',
      puntaje_total: data.puntajeTotal,
      puntaje_maximo: data.puntajeMaximo,
      porcentaje: porcentaje,
      tiempo_duracion: data.tiempoDuracion
    })
    .eq('id_intento', data.idIntento)
    .select()
    .single()
  
  if (error) throw error
  
  // Actualizar evaluacion con la mejor calificación
  const { data: intento } = await supabase
    .from('evaluacion_intento')
    .select('id_evaluacion, id_usuario, puntaje_total, puntaje_maximo')
    .eq('id_intento', data.idIntento)
    .single()
  
  if (intento) {
    await supabase
      .from('evaluacion')
      .update({
        calificacion: intento.puntaje_total,
        fecha_evaluacion: new Date().toISOString(),
        estado: intento.puntaje_total >= 60 ? 'aprobado' : 'reprobado'
      })
      .eq('id_evaluacion', intento.id_evaluacion)
  }
  
  return mapEvaluacionIntento(updated)
}

export async function obtenerResultadoIntento(idIntento: number): Promise<ResultadoEvaluacion> {
  // Obtener intento
  const { data: intento, error: errorIntento } = await supabase
    .from('evaluacion_intento')
    .select('*')
    .eq('id_intento', idIntento)
    .single()
  
  if (errorIntento) throw errorIntento
  
  // Obtener respuestas
  const { data: respuestas, error: errorRespuestas } = await supabase
    .from('respuesta_evaluacion')
    .select('*')
    .eq('id_usuario', intento.id_usuario)
    .eq('id_evaluacion', intento.id_evaluacion)
    .eq('intento', intento.numero_intento)
  
  if (errorRespuestas) throw errorRespuestas
  
  const respondidas = (respuestas || []).filter(r => r.id_opcion_selected).length
  const correctas = (respuestas || []).filter(r => r.puntos_obtenidos > 0).length
  
  return {
    intento: mapEvaluacionIntento(intento),
    respuestas: (respuestas || []).map(mapRespuestaEvaluacion),
    detalles: {
      totalPreguntas: (respuestas || []).length,
      respondidas,
      correctas,
      puntajeObtenido: intento.puntaje_total,
      puntajeMaximo: intento.puntaje_maximo,
      porcentaje: intento.porcentaje
    }
  }
}

// ============ MAPEOS ============

function mapPregunta(r: any): Pregunta {
  return {
    idPregunta: r.id_pregunta,
    idEvaluacion: r.id_evaluacion,
    titulo: r.titulo,
    descripcion: r.descripcion,
    tipo: r.tipo,
    orden: r.orden,
    activo: r.activo,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at
  }
}

function mapOpcionRespuesta(r: any): OpcionRespuesta {
  return {
    idOpcion: r.id_opcion,
    idPregunta: r.id_pregunta,
    textoOpcion: r.texto_opcion,
    esCorrecta: r.es_correcta,
    puntos: r.puntos,
    orden: r.orden,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at
  }
}

function mapRespuestaEvaluacion(r: any): RespuestaEvaluacion {
  return {
    idRespuesta: r.id_respuesta,
    idPregunta: r.id_pregunta,
    idUsuario: r.id_usuario,
    idEvaluacion: r.id_evaluacion,
    idOpcionSelected: r.id_opcion_selected,
    puntosObtenidos: r.puntos_obtenidos,
    intento: r.intento,
    respondidoEn: r.respondido_en,
    creadoEn: r.creado_en
  }
}

function mapEvaluacionIntento(r: any): EvaluacionIntento {
  return {
    idIntento: r.id_intento,
    idEvaluacion: r.id_evaluacion,
    idUsuario: r.id_usuario,
    numeroIntento: r.numero_intento,
    fechaInicio: r.fecha_inicio,
    fechaFin: r.fecha_fin,
    estado: r.estado,
    puntajeTotal: r.puntaje_total,
    puntajeMaximo: r.puntaje_maximo,
    porcentaje: r.porcentaje,
    tiempoDuracion: r.tiempo_duracion,
    creadoEn: r.creado_en
  }
}
```

---

## 🪝 **FASE 4: Hooks React Query**

**Archivo:** `src/hooks/useEvaluaciones.ts` (crear nuevo)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as evaluacionesService from '@/services/evaluaciones.service'

// ============ PREGUNTAS ============

export function usePreguntasPorEvaluacion(idEvaluacion?: number) {
  return useQuery({
    queryKey: ['preguntas', idEvaluacion],
    queryFn: () => evaluacionesService.obtenerPreguntasPorEvaluacion(idEvaluacion || 0),
    enabled: !!idEvaluacion,
    staleTime: 5 * 60 * 1000
  })
}

export function useCrearPregunta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: evaluacionesService.crearPregunta,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['preguntas', variables.idEvaluacion] })
      toast.success('Pregunta creada')
    },
    onError: () => toast.error('Error al crear pregunta')
  })
}

export function useActualizarPregunta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ idPregunta, data }: { idPregunta: number; data: any }) =>
      evaluacionesService.actualizarPregunta(idPregunta, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preguntas'] })
      toast.success('Pregunta actualizada')
    },
    onError: () => toast.error('Error al actualizar')
  })
}

export function useEliminarPregunta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: evaluacionesService.eliminarPregunta,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preguntas'] })
      toast.success('Pregunta eliminada')
    },
    onError: () => toast.error('Error al eliminar')
  })
}

// ============ OPCIONES ============

export function useCrearOpcion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: evaluacionesService.crearOpcion,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['preguntas'] })
      toast.success('Opción creada')
    },
    onError: () => toast.error('Error al crear opción')
  })
}

export function useActualizarOpcion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ idOpcion, data }: { idOpcion: number; data: any }) =>
      evaluacionesService.actualizarOpcion(idOpcion, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preguntas'] })
      toast.success('Opción actualizada')
    },
    onError: () => toast.error('Error al actualizar')
  })
}

export function useEliminarOpcion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: evaluacionesService.eliminarOpcion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preguntas'] })
      toast.success('Opción eliminada')
    },
    onError: () => toast.error('Error al eliminar')
  })
}

// ============ RESPUESTAS ============

export function useRegistrarRespuesta() {
  return useMutation({
    mutationFn: evaluacionesService.registrarRespuesta,
    onError: () => toast.error('Error al registrar respuesta')
  })
}

export function useObtenerRespuestasDelIntento(
  idUsuario?: number,
  idEvaluacion?: number,
  numeroIntento?: number
) {
  return useQuery({
    queryKey: ['respuestas-intento', idUsuario, idEvaluacion, numeroIntento],
    queryFn: () =>
      evaluacionesService.obtenerRespuestasDelIntento(
        idUsuario || 0,
        idEvaluacion || 0,
        numeroIntento || 1
      ),
    enabled: !!(idUsuario && idEvaluacion && numeroIntento)
  })
}

// ============ INTENTOS ============

export function useIniciarIntento() {
  return useMutation({
    mutationFn: evaluacionesService.iniciarIntento,
    onSuccess: () => toast.success('Intento iniciado'),
    onError: () => toast.error('Error al iniciar intento')
  })
}

export function useFinalizarIntento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: evaluacionesService.finalizarIntento,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluacion-intento'] })
      qc.invalidateQueries({ queryKey: ['evaluaciones'] })
      toast.success('Evaluación finalizada')
    },
    onError: () => toast.error('Error al finalizar')
  })
}

export function useObtenerResultadoIntento(idIntento?: number) {
  return useQuery({
    queryKey: ['resultado-intento', idIntento],
    queryFn: () => evaluacionesService.obtenerResultadoIntento(idIntento || 0),
    enabled: !!idIntento
  })
}
```

---

## 🎨 **FASE 5: UI - Crear Preguntas**

**Archivo:** `src/app/components/classroom/CreadorPreguntas.tsx` (crear nuevo)

```typescript
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog'
import { useCrearPregunta, useCrearOpcion, useEliminarPregunta, useEliminarOpcion } from '@/hooks/useEvaluaciones'
import type { Pregunta, OpcionRespuesta } from '@/types/app.types'
import { Plus, Trash2, Edit2 } from 'lucide-react'

interface CreadorPreguntasProps {
  idEvaluacion: number
  preguntas: Pregunta[]
}

export function CreadorPreguntas({ idEvaluacion, preguntas }: CreadorPreguntasProps) {
  const [preguntaEditando, setPreguntaEditando] = useState<Pregunta | null>(null)
  const [showDialogPregunta, setShowDialogPregunta] = useState(false)
  const [showDialogOpciones, setShowDialogOpciones] = useState(false)
  
  const crearPregunta = useCrearPregunta()
  const crearOpcion = useCrearOpcion()
  const eliminarPregunta = useEliminarPregunta()
  const eliminarOpcion = useEliminarOpcion()
  
  const { register: registerPregunta, handleSubmit: handleSubmitPregunta, reset: resetPregunta } = useForm()
  const { register: registerOpcion, handleSubmit: handleSubmitOpcion, reset: resetOpcion } = useForm()
  
  const onGuardarPregunta = (data: any) => {
    crearPregunta.mutate({
      idEvaluacion,
      titulo: data.titulo,
      descripcion: data.descripcion,
      tipo: 'multiple_choice',
      orden: preguntas.length + 1
    })
    resetPregunta()
    setShowDialogPregunta(false)
  }
  
  const onGuardarOpcion = (data: any) => {
    if (!preguntaEditando) return
    crearOpcion.mutate({
      idPregunta: preguntaEditando.idPregunta,
      textoOpcion: data.textoOpcion,
      esCorrecta: data.esCorrecta === 'true',
      puntos: parseFloat(data.puntos),
      orden: data.orden
    })
    resetOpcion()
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Preguntas de la Evaluación</h3>
        <Button onClick={() => setShowDialogPregunta(true)}>
          <Plus className="mr-2" /> Nueva Pregunta
        </Button>
      </div>
      
      <div className="space-y-4">
        {preguntas.map((pregunta, idx) => (
          <Card key={pregunta.idPregunta} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-semibold">Pregunta {idx + 1}: {pregunta.titulo}</p>
                <p className="text-sm text-gray-600">{pregunta.descripcion}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPreguntaEditando(pregunta)
                    setShowDialogOpciones(true)
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => eliminarPregunta.mutate(pregunta.idPregunta)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Mostrar opciones aquí */}
            <div className="mt-4 space-y-2 pl-4 border-l-2 border-primary">
              {/* Renderizar opciones */}
            </div>
          </Card>
        ))}
      </div>
      
      {/* Dialog Crear Pregunta */}
      <Dialog open={showDialogPregunta} onOpenChange={setShowDialogPregunta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Pregunta</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitPregunta(onGuardarPregunta)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Titulo de la pregunta</label>
              <Input {...registerPregunta('titulo', { required: true })} placeholder="¿Cuál es...?" />
            </div>
            <div>
              <label className="text-sm font-medium">Descripción (opcional)</label>
              <Input {...registerPregunta('descripcion')} placeholder="Contexto adicional" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={crearPregunta.isPending}>
                Crear Pregunta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog Crear Opciones */}
      {preguntaEditando && (
        <Dialog open={showDialogOpciones} onOpenChange={setShowDialogOpciones}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Opciones para: {preguntaEditando.titulo}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitOpcion(onGuardarOpcion)} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Texto de la opción</label>
                <Input {...registerOpcion('textoOpcion', { required: true })} placeholder="Opción A, B, C..." />
              </div>
              <div>
                <label className="text-sm font-medium">Puntos</label>
                <Input
                  type="number"
                  step="0.01"
                  {...registerOpcion('puntos', { required: true })}
                  placeholder="10"
                />
              </div>
              <div>
                <label className="text-sm font-medium">¿Es correcta?</label>
                <select {...registerOpcion('esCorrecta')}>
                  <option value="false">No</option>
                  <option value="true">Sí</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Orden (1=A, 2=B, 3=C, 4=D)</label>
                <Input type="number" {...registerOpcion('orden', { required: true })} min="1" max="4" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={crearOpcion.isPending}>
                  Agregar Opción
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
```

---

## 🎯 **FASE 6: UI - Resolver Evaluación**

**Archivo:** `src/app/components/classroom/ResolucionEvaluacion.tsx` (crear nuevo)

```typescript
import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group'
import { usePreguntasPorEvaluacion, useRegistrarRespuesta, useFinalizarIntento } from '@/hooks/useEvaluaciones'
import { useContext } from 'react'
import { AppContext } from '@/app/store/AppContext'
import type { PreguntaConOpciones, EvaluacionIntento } from '@/types/app.types'

interface ResolucionEvaluacionProps {
  idEvaluacion: number
  idIntento: number
}

export function ResolucionEvaluacion({ idEvaluacion, idIntento }: ResolucionEvaluacionProps) {
  const { usuarioActual } = useContext(AppContext)!
  const [indicePregunta, setIndicePregunta] = useState(0)
  const [respuestas, setRespuestas] = useState<{ [key: number]: number }>({})
  const [tiempoInicio] = useState(Date.now())
  
  const { data: preguntasData, isLoading } = usePreguntasPorEvaluacion(idEvaluacion)
  const registrarRespuesta = useRegistrarRespuesta()
  const finalizarIntento = useFinalizarIntento()
  
  const preguntas = preguntasData || []
  const preguntaActual = preguntas[indicePregunta]
  
  if (isLoading) return <div>Cargando preguntas...</div>
  if (!preguntaActual) return <div>No hay preguntas</div>
  
  const handleSeleccionarOpcion = (idOpcion: number) => {
    setRespuestas(prev => ({
      ...prev,
      [preguntaActual.pregunta.idPregunta]: idOpcion
    }))
    
    // Registrar respuesta en BD
    if (usuarioActual) {
      registrarRespuesta.mutate({
        idPregunta: preguntaActual.pregunta.idPregunta,
        idUsuario: usuarioActual.idUsuario,
        idEvaluacion,
        idOpcionSelected: idOpcion,
        intento: 1
      })
    }
  }
  
  const handleFinalizarEvaluacion = () => {
    // Calcular puntos totales
    let puntajeTotal = 0
    preguntas.forEach(p => {
      const idOpcionSeleccionada = respuestas[p.pregunta.idPregunta]
      if (idOpcionSeleccionada) {
        const opcion = p.opciones.find(o => o.idOpcion === idOpcionSeleccionada)
        puntajeTotal += opcion?.puntos || 0
      }
    })
    
    const puntajeMaximo = preguntas.reduce(
      (sum, p) => sum + Math.max(...p.opciones.map(o => o.puntos)),
      0
    )
    
    const tiempoDuracion = Math.floor((Date.now() - tiempoInicio) / 1000)
    
    finalizarIntento.mutate({
      idIntento,
      puntajeTotal,
      puntajeMaximo,
      tiempoDuracion
    })
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded">
        <p className="text-sm text-gray-600">
          Pregunta {indicePregunta + 1} de {preguntas.length}
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${((indicePregunta + 1) / preguntas.length) * 100}%` }}
          />
        </div>
      </div>
      
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">{preguntaActual.pregunta.titulo}</h2>
        {preguntaActual.pregunta.descripcion && (
          <p className="text-gray-600 mb-4">{preguntaActual.pregunta.descripcion}</p>
        )}
        
        <RadioGroup
          value={respuestas[preguntaActual.pregunta.idPregunta]?.toString() || ''}
          onValueChange={v => handleSeleccionarOpcion(parseInt(v))}
        >
          {preguntaActual.opciones.map((opcion, idx) => (
            <div key={opcion.idOpcion} className="flex items-center space-x-3 p-3 border rounded mb-2">
              <RadioGroupItem value={opcion.idOpcion.toString()} id={`opcion-${opcion.idOpcion}`} />
              <label htmlFor={`opcion-${opcion.idOpcion}`} className="flex-1 cursor-pointer">
                <span className="font-semibold">{String.fromCharCode(65 + idx)})&nbsp;</span>
                <span>{opcion.textoOpcion}</span>
              </label>
            </div>
          ))}
        </RadioGroup>
      </Card>
      
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setIndicePregunta(Math.max(0, indicePregunta - 1))}
          disabled={indicePregunta === 0}
        >
          ← Anterior
        </Button>
        
        {indicePregunta === preguntas.length - 1 ? (
          <Button
            onClick={handleFinalizarEvaluacion}
            disabled={finalizarIntento.isPending}
            className="bg-green-600"
          >
            Finalizar Evaluación
          </Button>
        ) : (
          <Button onClick={() => setIndicePregunta(indicePregunta + 1)}>
            Siguiente →
          </Button>
        )}
      </div>
    </div>
  )
}
```

---

## 📊 **FASE 7: UI - Ver Resultados**

**Archivo:** `src/app/components/classroom/ResultadosEvaluacion.tsx` (crear nuevo)

```typescript
import { useObtenerResultadoIntento } from '@/hooks/useEvaluaciones'
import { Card } from '@/app/components/ui/card'
import { CheckCircle, XCircle } from 'lucide-react'

interface ResultadosEvaluacionProps {
  idIntento: number
}

export function ResultadosEvaluacion({ idIntento }: ResultadosEvaluacionProps) {
  const { data: resultado, isLoading } = useObtenerResultadoIntento(idIntento)
  
  if (isLoading) return <div>Cargando resultados...</div>
  if (!resultado) return <div>No se encontraron resultados</div>
  
  const { intento, detalles } = resultado
  const esAprobado = detalles.porcentaje >= 60
  
  return (
    <div className="space-y-6">
      {/* Resumen */}
      <Card className={`p-6 ${esAprobado ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className="text-center">
          {esAprobado ? (
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-2" />
          ) : (
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-2" />
          )}
          <h2 className={`text-2xl font-bold ${esAprobado ? 'text-green-700' : 'text-red-700'}`}>
            {esAprobado ? '¡Felicidades!' : 'No aprobado'}
          </h2>
          <p className="text-gray-600 mt-2">
            {detalles.porcentaje.toFixed(1)}% ({detalles.puntajeObtenido} / {detalles.puntajeMaximo} puntos)
          </p>
        </div>
      </Card>
      
      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{detalles.totalPreguntas}</p>
          <p className="text-sm text-gray-600">Total preguntas</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{detalles.correctas}</p>
          <p className="text-sm text-gray-600">Correctas</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{detalles.totalPreguntas - detalles.correctas}</p>
          <p className="text-sm text-gray-600">Incorrectas</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">
            {intento.tiempoDuracion ? Math.floor(intento.tiempoDuracion / 60) : 0}m
          </p>
          <p className="text-sm text-gray-600">Tiempo</p>
        </Card>
      </div>
      
      {/* Detalle de respuestas */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Detalle de respuestas</h3>
        {resultado.respuestas.map((respuesta, idx) => (
          <Card key={respuesta.idRespuesta} className="p-4">
            <p className="font-semibold mb-2">Pregunta {idx + 1}</p>
            <p className={`text-sm ${respuesta.puntosObtenidos ? 'text-green-600' : 'text-red-600'}`}>
              {respuesta.puntosObtenidos ? '✓ Correcta' : '✗ Incorrecta'}
              {respuesta.puntosObtenidos && ` (+${respuesta.puntosObtenidos} puntos)`}
            </p>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

---

## 📋 **Resumen de Implementación**

| Fase | Componentes | Archivos | Tiempo |
|------|----------|----------|--------|
| **1** | Migraciones BD | 1 SQL | 1 día |
| **2** | Tipos TS | 1 app.types.ts | 0.5 días |
| **3** | Servicios | 1 evaluaciones.service.ts | 1 día |
| **4** | Hooks | 1 useEvaluaciones.ts | 0.5 días |
| **5** | UI Crear Preguntas | 1 componente | 1 día |
| **6** | UI Resolver | 1 componente | 1.5 días |
| **7** | UI Resultados | 1 componente | 1 día |

**Total: 6-7 días de desarrollo**

---

## ✅ **Criterios de Aceptación**

- ✅ Se pueden crear evaluaciones con múltiples preguntas
- ✅ Cada pregunta tiene 2-4 opciones de respuesta
- ✅ Cada opción tiene puntuación asignada
- ✅ Sistema calcula automáticamente puntuación final
- ✅ Se registra historial de intentos
- ✅ Se muestra calificación aprobada/reprobada
- ✅ Se muestran detalles de respuestas correctas/incorrectas

---

## 🎯 **RESUMEN EJECUTIVO - IGLESIABD 2026**

### 🏗️ **Arquitectura Enterprise-Ready**
- **Frontend**: React 18 + TypeScript + Vite + TanStack Query
- **Backend**: Supabase (PostgreSQL + Auth + Real-time + RLS)
- **UI**: shadcn/ui + Tailwind CSS + Framer Motion
- **Total de código**: 25,000+ líneas TypeScript + 6,500 líneas SQL

### 📊 **Métricas del Sistema**
- **📁 150+ archivos TypeScript**
- **🗄️ 28 tablas en base de datos**
- **📜 24 migraciones SQL**
- **🧩 50+ componentes UI**
- **🎣 10+ hooks personalizados**
- **🔧 9 servicios de datos**
- **📋 40+ tipos TypeScript**

### 🎓 **Sistema Educativo Completo**
#### **Cursos y Módulos** ✅
- Creación y gestión por líderes/administradores
- Contenido markdown con editor integrado
- Sistema de recursos (archivos y enlaces)
- Seguimiento de progreso de estudiantes

#### **Evaluaciones Duales** ✅
**Evaluaciones de Calificación:**
- Página dedicada en `/app/evaluaciones`
- Calificación manual de desempeño estudiantil
- Estados: pendiente/aprobado/reprobado
- Gestionable por líderes y admins

**Evaluaciones de Cuestionario:**
- Sistema completo de preguntas y opciones
- 3 tipos: opción múltiple, verdadero/falso, abierta
- Calificación automática con puntuación por opción
- Editor visual integrado en módulos
- Intentos limitados con historial completo

### 🔐 **Sistema de Seguridad Avanzado**
- **4 roles jerárquicos**: Super Admin, Admin Iglesia, Líder Ministerio, Servidor
- **RLS policies**: 6 fases de implementación
- **Control granular**: Por iglesia, ministerio, curso y módulo
- **Bypass seguro**: Funciones SECURITY DEFINER

### ✅ **Estado de MVP: COMPLETADO**
- ✅ **Sistema de autenticación** completo
- ✅ **Gestión de iglesias y ministerios** funcional
- ✅ **Plataforma educativa** con evaluaciones automáticas
- ✅ **Interfaz moderna** responsive
- ✅ **Base de datos normalizada** con integridad
- ✅ **Documentación técnica** completa (1700+ líneas)

**IGLESIABD es un sistema de gestión eclesiástica completamente funcional con capacidades educativas avanzadas.** 🎉✨
