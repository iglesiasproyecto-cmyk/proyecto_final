# E2E CRUD Testing por Rol — Design Spec
**Fecha:** 2026-05-07  
**Proyecto:** IGLESIABD  
**Scope:** Suite Playwright que verifica cada operación CRUD para los 4 roles del sistema.

---

## Contexto

La app tiene 4 roles con permisos diferenciados tanto en el frontend (guards de navegación, botones ocultos) como en el backend (Supabase RLS policies):

| Rol | Slug | Alcance |
|-----|------|---------|
| Super Administrador | `super_admin` | Global — todas las iglesias |
| Administrador de Iglesia | `admin_iglesia` | Tenant — solo su iglesia |
| Líder | `lider` | Tenant — solo sus ministerios |
| Servidor | `servidor` | Tenant — solo sus asignaciones |

---

## Arquitectura del Suite

### Patrón: Fixtures de sesión por rol + proyectos paralelos

Playwright soporta nativamente el patrón `storageState` para reutilizar sesiones autenticadas. El setup corre una sola vez, persiste las 4 sesiones en `.auth/`, y los 4 proyectos corren los specs en paralelo, cada uno con la sesión de su rol.

### Estructura de archivos

```
e2e/
  auth.setup.ts                   # Login de los 4 roles, guarda storageState
  fixtures.ts                     # Tipos, helpers y page-object utils compartidos
  specs/
    01-routes-guard.spec.ts        # Acceso/denegación de rutas por rol
    02-churches.spec.ts            # CRUD Iglesias
    03-sedes.spec.ts               # CRUD Sedes
    04-pastores.spec.ts            # CRUD Pastores + asignaciones iglesia/sede
    05-members.spec.ts             # CRUD Miembros de ministerio
    06-ministerios.spec.ts         # CRUD Ministerios y miembros
    07-eventos.spec.ts             # CRUD Eventos y tipos de evento
    08-tareas.spec.ts              # CRUD Tareas + flujo evidencia servidor
    09-aula.spec.ts                # CRUD Cursos, módulos, evaluaciones

playwright.config.ts               # 5 projects: setup + 4 roles
.env.test                          # Credenciales de los 4 usuarios de prueba (gitignored)
.auth/                             # storageState por rol (gitignored)
  super_admin.json
  admin_iglesia.json
  lider.json
  servidor.json
```

### `playwright.config.ts` — estructura de projects

```ts
projects: [
  {
    name: 'setup',
    testMatch: /auth\.setup\.ts/,
  },
  {
    name: 'super_admin',
    use: { storageState: '.auth/super_admin.json' },
    dependencies: ['setup'],
  },
  {
    name: 'admin_iglesia',
    use: { storageState: '.auth/admin_iglesia.json' },
    dependencies: ['setup'],
  },
  {
    name: 'lider',
    use: { storageState: '.auth/lider.json' },
    dependencies: ['setup'],
  },
  {
    name: 'servidor',
    use: { storageState: '.auth/servidor.json' },
    dependencies: ['setup'],
  },
]
```

---

## Variables de entorno — `.env.test`

```ini
TEST_URL=http://localhost:5173

# Credenciales de usuarios de prueba (uno por rol)
TEST_SUPER_ADMIN_EMAIL=
TEST_SUPER_ADMIN_PASSWORD=
TEST_ADMIN_IGLESIA_EMAIL=
TEST_ADMIN_IGLESIA_PASSWORD=
TEST_LIDER_EMAIL=
TEST_LIDER_PASSWORD=
TEST_SERVIDOR_EMAIL=
TEST_SERVIDOR_PASSWORD=

# IDs de datos de prueba en Supabase local
TEST_IGLESIA_ID=          # ID de la iglesia de prueba del tenant
TEST_MINISTERIO_ID=       # ID del ministerio al que pertenece el lider de prueba
```

El archivo `.env.test` está gitignored. Se documenta `.env.test.example` con claves vacías.

---

## Matriz de Permisos a Testear

Cada ✅/❌ implica un test. Los ❌ verifican: (a) el elemento UI está oculto, y (b) si se intenta la mutación directa a Supabase, la RLS la bloquea con error `42501` o resultado vacío.

### Rutas y Navegación

| Ruta | super_admin | admin_iglesia | lider | servidor |
|------|:-----------:|:-------------:|:-----:|:--------:|
| `/app/global/*` | ✅ accede | ❌ redirige al tenant | ❌ redirige | ❌ redirige |
| `/app/:id/dashboard` | ✅ | ✅ | ✅ | ✅ |
| `/app/:id/usuarios` | ✅ | ✅ | ❌ botón oculto | ❌ |
| `/app/:id/miembros` | ✅ | ✅ | ✅ (su min.) | ❌ oculto en nav |
| `/app/:id/mi-ministerio` | ❌ no aplica | ❌ | ✅ | ✅ |

### Iglesias (ChurchesPage / ChurchDetailPage)

| Operación | super_admin | admin_iglesia | lider | servidor |
|-----------|:-----------:|:-------------:|:-----:|:--------:|
| Read lista | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ❌ botón no visible | ❌ | ❌ |
| Edit propia | ✅ | ✅ | ❌ | ❌ |
| Edit otra iglesia | ✅ | ❌ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ |

### Sedes (SedesPage)

| Operación | super_admin | admin_iglesia | lider | servidor |
|-----------|:-----------:|:-------------:|:-----:|:--------:|
| Read | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ❌ | ❌ |
| Edit | ✅ | ✅ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |

### Pastores (PastoresPage)

| Operación | super_admin | admin_iglesia | lider | servidor |
|-----------|:-----------:|:-------------:|:-----:|:--------:|
| Read | ✅ | ✅ | ✅ | ✅ |
| Asignar a iglesia | ✅ | ❌ | ❌ | ❌ |
| Asignar a sede | ✅ | ✅ | ❌ | ❌ |
| Desasignar | ✅ | ✅ (su iglesia) | ❌ | ❌ |

### Miembros de Ministerio (MembersPage)

| Operación | super_admin | admin_iglesia | lider | servidor |
|-----------|:-----------:|:-------------:|:-----:|:--------:|
| Read (todos) | ✅ | ✅ | ❌ | ❌ |
| Read (su ministerio) | ✅ | ✅ | ✅ | ❌ |
| Agregar miembro | ✅ | ✅ | ✅ (su min.) | ❌ |
| Eliminar miembro | ✅ | ✅ | ✅ (su min.) | ❌ |

### Ministerios (MinisteriosPage)

| Operación | super_admin | admin_iglesia | lider | servidor |
|-----------|:-----------:|:-------------:|:-----:|:--------:|
| Read | ✅ | ✅ | ✅ | ✅ |
| Create ministerio | ✅ | ✅ | ❌ | ❌ |
| Edit ministerio | ✅ | ✅ | ❌ | ❌ |
| Delete ministerio | ✅ | ✅ | ❌ | ❌ |
| Gestionar servidores | ✅ | ✅ | ✅ (su min.) | ❌ |

### Eventos (EventsPage)

| Operación | super_admin | admin_iglesia | lider | servidor |
|-----------|:-----------:|:-------------:|:-----:|:--------:|
| Read | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ | ❌ |
| Edit | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ | ✅ | ❌ |
| Gestionar tipos de evento | ✅ | ✅ | ❌ | ❌ |

### Tareas (TasksPage)

| Operación | super_admin | admin_iglesia | lider | servidor |
|-----------|:-----------:|:-------------:|:-----:|:--------:|
| Read todas | ✅ | ✅ | ✅ | ❌ |
| Read asignadas a mí | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ | ❌ |
| Asignar servidor | ✅ | ✅ | ✅ | ❌ |
| Edit | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ | ✅ | ❌ |
| Actualizar estado/evidencia | ❌ N/A | ❌ N/A | ❌ N/A | ✅ solo las suyas |

### Aula Virtual (AulaPage / CursoDetallePage)

| Operación | super_admin | admin_iglesia | lider | servidor |
|-----------|:-----------:|:-------------:|:-----:|:--------:|
| Read cursos | ✅ | ✅ | ✅ | ✅ (inscritos) |
| Create curso | ✅ | ✅ | ✅ | ❌ |
| Edit curso | ✅ | ✅ | ✅ | ❌ |
| Delete curso | ✅ | ✅ | ✅ | ❌ |
| Gestionar módulos | ✅ | ✅ | ✅ | ❌ |
| Gestionar evaluaciones | ✅ | ✅ | ✅ | ❌ |
| Inscribir servidores | ✅ | ✅ | ✅ | ❌ |
| Rendir evaluación | ❌ N/A | ❌ N/A | ❌ N/A | ✅ inscrito |
| Ver progreso individual | ✅ | ✅ | ✅ | solo el propio |

### Usuarios (UsuariosPage)

| Operación | super_admin | admin_iglesia | lider | servidor |
|-----------|:-----------:|:-------------:|:-----:|:--------:|
| Read lista | ✅ (todos) | ✅ (su iglesia) | ❌ | ❌ |
| Invitar usuario | ✅ | ✅ | ❌ | ❌ |
| Editar perfil | ✅ | ✅ (su iglesia) | ❌ | ❌ |
| Toggle activo/inactivo | ✅ | ✅ | ❌ | ❌ |
| Asignar/quitar rol | ✅ | ✅ (su iglesia) | ❌ | ❌ |
| Eliminar usuario | ✅ | ❌ | ❌ | ❌ |

---

## Qué verifica cada test

Cada spec cubre **dos dimensiones** para cada operación CRUD:

### 1. Tests funcionales — "¿El CRUD realmente funciona?"

Para roles CON permiso: el test ejecuta la operación completa en el navegador y verifica el resultado real en la UI.

```ts
test('super_admin can create sede and it appears in list', async ({ page }) => {
  await page.goto(`${BASE_URL}/app/${IGLESIA_ID}/sedes`)

  // Abrir formulario
  await page.getByRole('button', { name: /nueva sede/i }).click()

  // Llenar y enviar
  const nombre = `Sede Test ${Date.now()}`
  await page.getByLabel(/nombre/i).fill(nombre)
  await page.getByRole('button', { name: /guardar|crear/i }).click()

  // Verificar que aparece en la lista (funcionalidad real)
  await expect(page.getByText(nombre)).toBeVisible()
})

test('super_admin can edit sede and change persists', async ({ page }) => {
  // ... navega, abre edit, cambia nombre, guarda, verifica nuevo nombre en lista
})

test('super_admin can delete sede and it disappears', async ({ page }) => {
  // ... navega, hace delete, confirma, verifica que ya no aparece en lista
})
```

### 2. Tests de permisos — "¿Los roles sin permiso están bloqueados?"

Para roles SIN permiso: verifica que (a) la UI no expone el control, y (b) la RLS bloquea la operación si se intenta directamente.

```ts
test('servidor cannot see create button', async ({ page }) => {
  await page.goto(`${BASE_URL}/app/${IGLESIA_ID}/sedes`)
  await expect(page.getByRole('button', { name: /nueva sede/i })).not.toBeVisible()
})

// Test RLS sin browser — usa supabase-js con JWT del rol
test('servidor is blocked by RLS on direct insert', async () => {
  const { error } = await servidorSupabase.from('sede').insert({ nombre: 'hack', id_iglesia: IGLESIA_ID })
  expect(error?.code).toBe('42501')  // insufficient_privilege
})
```

### Cobertura funcional por módulo

| Módulo | Operaciones funcionales testeadas (rol con permiso) |
|--------|-----------------------------------------------------|
| Sedes | Create → aparece en lista; Edit → nombre actualizado; Delete → desaparece |
| Iglesias | Edit datos básicos → cambio persiste en detalle |
| Pastores | Asignar pastor → aparece en la sección; Desasignar → desaparece |
| Miembros | Agregar al ministerio → aparece en tabla; Eliminar → desaparece |
| Ministerios | Create ministerio → aparece en lista; Edit nombre → actualizado |
| Eventos | Create → aparece en calendar/lista; Edit → cambio visible; Delete → desaparece |
| Tareas | Create + asignar servidor → tarea visible; servidor marca como completada → estado cambia |
| Cursos | Create curso → aparece en aula; agregar módulo → módulo visible; servidor rinde evaluación → avance registrado |
| Usuarios | Invitar → usuario aparece en lista; toggle activo → estado cambia |

Los tests de RLS sin browser (Fase 5) se escriben como tests de Node usando la `supabase-js` client con el token JWT del usuario de prueba, sin instancia de browser.

---

## Prerequisitos de ejecución

1. Supabase local corriendo: `supabase start`
2. Dev server corriendo: `npm run dev`
3. `.env.test` configurado con credenciales de los 4 usuarios de prueba
4. Los 4 usuarios de prueba existen en la base de datos local con sus roles asignados
5. Datos semilla: al menos 1 iglesia, 1 sede, 1 ministerio, 1 evento y 1 curso de prueba

---

## Comandos npm a agregar

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:report": "playwright show-report"
```

---

## Fases de implementación

1. **Instalación y configuración base** — Instalar Playwright, `playwright.config.ts`, `.env.test.example`
2. **Auth setup** — `auth.setup.ts` que hace login de los 4 roles y guarda sessions
3. **Route guards** — `01-routes-guard.spec.ts`
4. **CRUD por módulo** — specs 02 al 09, en orden
5. **RLS backend tests** — tests sin browser que verifican las policies directamente
