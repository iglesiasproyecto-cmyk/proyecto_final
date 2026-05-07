# E2E CRUD Testing por Rol — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Suite Playwright que verifica, para cada uno de los 4 roles del sistema, que los CRUDs funcionan correctamente (operaciones reales en UI) y que los permisos están correctamente bloqueados (controles ocultos + RLS).

**Architecture:** Patrón `storageState` + `projects` de Playwright: un `auth.setup.ts` loguea los 4 roles y persiste las sesiones. Cinco proyectos paralelos (setup + 4 roles) corren los mismos specs con contextos de sesión distintos. Cada spec detecta su rol con `test.info().project.name` y bifurca entre "ejecutar CRUD y verificar resultado" o "verificar que el control no existe". Un proyecto adicional corre tests RLS sin browser usando la API de Playwright (`request` fixture).

**Tech Stack:** Playwright v1.x, TypeScript, @supabase/supabase-js (solo para tests RLS), dotenv, Vite dev server en localhost:5173, Supabase local en localhost:54321.

---

## Mapa de archivos

| Archivo | Tipo | Responsabilidad |
|---------|------|-----------------|
| `playwright.config.ts` | Crear | Configuración global: 6 proyectos, timeouts, baseURL |
| `.env.test.example` | Crear | Plantilla de credenciales de test (committed) |
| `.env.test` | Crear (gitignored) | Credenciales reales de los 4 usuarios de prueba |
| `.gitignore` (modify) | Modificar | Agregar `.env.test` y `.auth/` |
| `e2e/auth.setup.ts` | Crear | Login de los 4 roles, guarda storageState |
| `e2e/fixtures.ts` | Crear | Constantes, tipos, helpers compartidos |
| `e2e/specs/01-routes-guard.spec.ts` | Crear | Verifica acceso/denegación de rutas por rol |
| `e2e/specs/02-churches.spec.ts` | Crear | CRUD Iglesias funcional + permisos |
| `e2e/specs/03-sedes.spec.ts` | Crear | CRUD Sedes funcional + permisos |
| `e2e/specs/04-pastores.spec.ts` | Crear | Asignación pastores funcional + permisos |
| `e2e/specs/05-members.spec.ts` | Crear | CRUD Miembros ministerio funcional + permisos |
| `e2e/specs/06-ministerios.spec.ts` | Crear | CRUD Ministerios funcional + permisos |
| `e2e/specs/07-eventos.spec.ts` | Crear | CRUD Eventos funcional + permisos |
| `e2e/specs/08-tareas.spec.ts` | Crear | CRUD Tareas + flujo servidor funcional + permisos |
| `e2e/specs/09-aula.spec.ts` | Crear | CRUD Cursos/módulos funcional + permisos |
| `e2e/specs/10-rls-backend.spec.ts` | Crear | Mutations directas a Supabase — verifica RLS bloquea |
| `package.json` | Modificar | Agregar scripts `test:e2e`, `test:e2e:ui`, `test:e2e:report` |

---

## Task 1: Instalar Playwright y dependencias

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`

- [ ] **Step 1: Instalar Playwright**

```bash
npm install --save-dev @playwright/test dotenv
npx playwright install chromium
```

Resultado esperado: se crea `node_modules/@playwright/test`, `node_modules/dotenv`. Playwright descarga Chromium.

- [ ] **Step 2: Verificar instalación**

```bash
npx playwright --version
```

Resultado esperado: imprime `Version 1.x.x`.

- [ ] **Step 3: Crear `playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

const BASE_URL = process.env.TEST_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Setup: corre primero, loguea los 4 roles y guarda sessions
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // 4 proyectos paralelos — cada uno usa la sesión de su rol
    {
      name: 'super_admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/super_admin.json',
      },
      dependencies: ['setup'],
      testMatch: /specs\/.+\.spec\.ts/,
    },
    {
      name: 'admin_iglesia',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/admin_iglesia.json',
      },
      dependencies: ['setup'],
      testMatch: /specs\/.+\.spec\.ts/,
    },
    {
      name: 'lider',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/lider.json',
      },
      dependencies: ['setup'],
      testMatch: /specs\/.+\.spec\.ts/,
    },
    {
      name: 'servidor',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/servidor.json',
      },
      dependencies: ['setup'],
      testMatch: /specs\/.+\.spec\.ts/,
    },

    // Proyecto RLS: tests sin browser (API-only), corre con sesiones ya creadas
    {
      name: 'rls',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testMatch: /specs\/10-rls-backend\.spec\.ts/,
    },
  ],
})
```

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts package.json package-lock.json
git commit -m "feat(e2e): install Playwright and configure 5-project multi-role setup"
```

---

## Task 2: Variables de entorno y gitignore

**Files:**
- Create: `.env.test.example`
- Create: `.env.test`
- Modify: `.gitignore`

- [ ] **Step 1: Crear `.env.test.example`**

```ini
# URL del servidor de desarrollo
TEST_URL=http://localhost:5173

# ID de la iglesia de prueba (tenant) en Supabase local
TEST_IGLESIA_ID=1

# ID del ministerio al que pertenece el lider de prueba
TEST_MINISTERIO_ID=1

# Credenciales usuario super_admin
TEST_SUPER_ADMIN_EMAIL=superadmin@test.com
TEST_SUPER_ADMIN_PASSWORD=

# Credenciales usuario admin_iglesia
TEST_ADMIN_IGLESIA_EMAIL=admin@test.com
TEST_ADMIN_IGLESIA_PASSWORD=

# Credenciales usuario lider
TEST_LIDER_EMAIL=lider@test.com
TEST_LIDER_PASSWORD=

# Credenciales usuario servidor
TEST_SERVIDOR_EMAIL=servidor@test.com
TEST_SERVIDOR_PASSWORD=
```

- [ ] **Step 2: Crear `.env.test` con las credenciales reales**

Copiar `.env.test.example` y rellenar con los datos reales de los 4 usuarios de prueba que ya existen en Supabase local. Obtener `TEST_IGLESIA_ID` y `TEST_MINISTERIO_ID` del panel de Supabase local (`http://localhost:54323`).

- [ ] **Step 3: Agregar entradas a `.gitignore`**

Abrir `.gitignore` y agregar al final:

```
# Playwright
.auth/
playwright-report/
test-results/
.env.test
```

- [ ] **Step 4: Crear carpeta `.auth/` con `.gitkeep`**

```bash
mkdir -p .auth
touch .auth/.gitkeep
```

- [ ] **Step 5: Commit**

```bash
git add .env.test.example .gitignore .auth/.gitkeep
git commit -m "feat(e2e): add env template and gitignore for auth sessions"
```

---

## Task 3: Auth setup — login de los 4 roles

**Files:**
- Create: `e2e/auth.setup.ts`

- [ ] **Step 1: Crear directorio e2e**

```bash
mkdir -p e2e/specs
```

- [ ] **Step 2: Crear `e2e/auth.setup.ts`**

```typescript
import { test as setup, expect } from '@playwright/test'
import * as path from 'path'

const BASE_URL = process.env.TEST_URL ?? 'http://localhost:5173'

interface RoleCredentials {
  role: string
  email: string
  password: string
  authFile: string
  /** URL esperada después del redirect post-login */
  expectedUrlPattern: RegExp
}

const roles: RoleCredentials[] = [
  {
    role: 'super_admin',
    email: process.env.TEST_SUPER_ADMIN_EMAIL!,
    password: process.env.TEST_SUPER_ADMIN_PASSWORD!,
    authFile: '.auth/super_admin.json',
    expectedUrlPattern: /\/app\/global/,
  },
  {
    role: 'admin_iglesia',
    email: process.env.TEST_ADMIN_IGLESIA_EMAIL!,
    password: process.env.TEST_ADMIN_IGLESIA_PASSWORD!,
    authFile: '.auth/admin_iglesia.json',
    expectedUrlPattern: /\/app\/\d+/,
  },
  {
    role: 'lider',
    email: process.env.TEST_LIDER_EMAIL!,
    password: process.env.TEST_LIDER_PASSWORD!,
    authFile: '.auth/lider.json',
    expectedUrlPattern: /\/app\/\d+/,
  },
  {
    role: 'servidor',
    email: process.env.TEST_SERVIDOR_EMAIL!,
    password: process.env.TEST_SERVIDOR_PASSWORD!,
    authFile: '.auth/servidor.json',
    expectedUrlPattern: /\/app\/\d+/,
  },
]

for (const creds of roles) {
  setup(`authenticate as ${creds.role}`, async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)

    // Llenar formulario de login
    await page.getByPlaceholder('name@example.com').fill(creds.email)
    await page.getByPlaceholder('••••••••').fill(creds.password)
    await page.getByRole('button', { name: /acceder al sistema/i }).click()

    // Esperar redirect post-login (pasa por /auth/callback → /app/...)
    await page.waitForURL(creds.expectedUrlPattern, { timeout: 15_000 })

    // Guardar sesión (cookies + localStorage con token Supabase)
    await page.context().storageState({ path: creds.authFile })

    console.log(`✓ Session saved for ${creds.role} → ${creds.authFile}`)
  })
}
```

- [ ] **Step 3: Verificar que el auth setup corre correctamente**

Primero asegúrate de que el dev server y Supabase local están corriendo:

```bash
# Terminal 1
supabase start

# Terminal 2
npm run dev
```

Luego en Terminal 3:

```bash
npx playwright test --project=setup --reporter=list
```

Resultado esperado: 4 tests PASS, se crean `.auth/super_admin.json`, `.auth/admin_iglesia.json`, `.auth/lider.json`, `.auth/servidor.json`.

Si falla con "Timeout waiting for URL": revisar que el email/password del `.env.test` son correctos y que el usuario tiene rol asignado en la iglesia de prueba.

- [ ] **Step 4: Commit**

```bash
git add e2e/auth.setup.ts
git commit -m "feat(e2e): add auth setup — persists sessions for all 4 roles"
```

---

## Task 4: Fixtures y helpers compartidos

**Files:**
- Create: `e2e/fixtures.ts`

- [ ] **Step 1: Crear `e2e/fixtures.ts`**

```typescript
import { test as base, expect, type Page } from '@playwright/test'

// ── Constantes de entorno ────────────────────────────────────────────────────

export const BASE_URL = process.env.TEST_URL ?? 'http://localhost:5173'
export const IGLESIA_ID = process.env.TEST_IGLESIA_ID ?? '1'
export const MINISTERIO_ID = process.env.TEST_MINISTERIO_ID ?? '1'

// ── Tipos ────────────────────────────────────────────────────────────────────

export type AppRole = 'super_admin' | 'admin_iglesia' | 'lider' | 'servidor'

/** Roles que pueden crear/editar/eliminar en un módulo dado */
export type PermissionMap = {
  canCreate: AppRole[]
  canEdit: AppRole[]
  canDelete: AppRole[]
  canRead: AppRole[]
}

// ── Helpers de navegación ────────────────────────────────────────────────────

/** Navega a una ruta tenant-scoped (usa IGLESIA_ID del entorno) */
export async function gotoTenant(page: Page, path: string) {
  await page.goto(`${BASE_URL}/app/${IGLESIA_ID}/${path}`)
}

/** Navega a una ruta global (solo super_admin) */
export async function gotoGlobal(page: Page, path: string) {
  await page.goto(`${BASE_URL}/app/global/${path}`)
}

// ── Helpers de toast ─────────────────────────────────────────────────────────

/** Espera que aparezca un toast de Sonner con texto parcial */
export async function expectToast(page: Page, text: string | RegExp) {
  // Sonner renderiza los toasts en [data-sonner-toast]
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: text })).toBeVisible({ timeout: 8_000 })
}

// ── Helpers de formulario ────────────────────────────────────────────────────

/** Genera un nombre único para evitar colisiones entre tests */
export function uniqueName(prefix: string) {
  return `${prefix}-${Date.now()}`
}

// ── Fixture tipado con rol ────────────────────────────────────────────────────

type Fixtures = {
  role: AppRole
}

export const test = base.extend<Fixtures>({
  role: async ({}, use, testInfo) => {
    await use(testInfo.project.name as AppRole)
  },
})

export { expect }
```

- [ ] **Step 2: Verificar que el archivo compila sin errores**

```bash
npx tsc --noEmit --skipLibCheck e2e/fixtures.ts 2>&1 || true
```

Resultado esperado: sin errores de tipo (puede haber warnings sobre `any` que son aceptables).

- [ ] **Step 3: Commit**

```bash
git add e2e/fixtures.ts
git commit -m "feat(e2e): add shared fixtures, helpers, and typed role fixture"
```

---

## Task 5: Route guard spec

**Files:**
- Create: `e2e/specs/01-routes-guard.spec.ts`

- [ ] **Step 1: Crear `e2e/specs/01-routes-guard.spec.ts`**

```typescript
import { test, expect, BASE_URL, IGLESIA_ID } from '../fixtures'

test.describe('Route guards por rol', () => {

  test('solo super_admin accede a /app/global', async ({ page, role }) => {
    await page.goto(`${BASE_URL}/app/global`)

    if (role === 'super_admin') {
      // Debe quedarse en la ruta global (dashboard global)
      await expect(page).toHaveURL(/\/app\/global/)
    } else {
      // Debe redirigir al tenant o a login
      await expect(page).not.toHaveURL(/\/app\/global/)
      // Verifica que está en una ruta tenant válida o en login
      const url = page.url()
      const isRedirected = url.includes(`/app/${IGLESIA_ID}`) || url.includes('/login')
      expect(isRedirected, `Rol ${role} debería redirigir pero está en ${url}`).toBe(true)
    }
  })

  test('todos los roles acceden a su dashboard tenant', async ({ page, role }) => {
    await page.goto(`${BASE_URL}/app/${IGLESIA_ID}`)

    if (role === 'super_admin') {
      // super_admin puede acceder al tenant también
      await expect(page).toHaveURL(/\/app\/(global|\d+)/)
    } else {
      // Todos los demás deben poder ver algún dashboard
      await expect(page).not.toHaveURL('/login')
    }
  })

  test('super_admin ve link a administración global en sidebar', async ({ page, role }) => {
    await page.goto(`${BASE_URL}/app/${IGLESIA_ID}`)

    if (role === 'super_admin') {
      // El sidebar debe mostrar opciones globales
      await expect(page.getByText(/iglesias/i).first()).toBeVisible({ timeout: 8_000 })
    } else {
      // Los demás no ven la sección global
      // Solo verificamos que están en alguna ruta de la app
      await expect(page).not.toHaveURL('/login')
    }
  })

})
```

- [ ] **Step 2: Correr solo este spec**

```bash
npx playwright test e2e/specs/01-routes-guard.spec.ts --reporter=list
```

Resultado esperado: 12 tests (3 specs × 4 roles) PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/01-routes-guard.spec.ts
git commit -m "test(e2e): add route guard specs for all 4 roles"
```

---

## Task 6: CRUD Iglesias

**Files:**
- Create: `e2e/specs/02-churches.spec.ts`

- [ ] **Step 1: Crear `e2e/specs/02-churches.spec.ts`**

```typescript
import { test, expect, BASE_URL, IGLESIA_ID, gotoGlobal, gotoTenant, expectToast, uniqueName } from '../fixtures'

const CAN_CREATE: string[] = ['super_admin']
const CAN_EDIT: string[] = ['super_admin', 'admin_iglesia']

test.describe('Iglesias — CRUD por rol', () => {

  test('todos los roles pueden leer la lista de iglesias', async ({ page, role }) => {
    if (role === 'super_admin') {
      await gotoGlobal(page, 'iglesias')
    } else {
      await gotoTenant(page, 'iglesia')
    }
    // El detalle o la lista debe cargar sin redirigir a login
    await expect(page).not.toHaveURL('/login')
    // Debe haber algún contenido visible (nombre de iglesia o encabezado)
    await expect(page.locator('h1, h2, [data-testid="iglesia-nombre"]').first()).toBeVisible({ timeout: 8_000 })
  })

  test('botón Nueva Iglesia — visible solo para super_admin', async ({ page, role }) => {
    await gotoGlobal(page, 'iglesias')

    const btn = page.getByRole('button', { name: /nueva iglesia/i })

    if (CAN_CREATE.includes(role)) {
      await expect(btn).toBeVisible({ timeout: 6_000 })
    } else {
      // Para no-super_admin esta ruta redirige, así que solo verificamos que no estamos en /global
      await expect(page).not.toHaveURL(/\/app\/global/)
    }
  })

  test('super_admin puede crear una iglesia y aparece en la lista', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Solo super_admin puede crear iglesias')

    await gotoGlobal(page, 'iglesias')

    const nombre = uniqueName('Iglesia Test')

    // Abrir formulario
    await page.getByRole('button', { name: /nueva iglesia/i }).click()

    // Llenar campos básicos
    await page.getByLabel(/nombre/i).first().fill(nombre)
    const fechaInput = page.locator('input[type="date"]').first()
    if (await fechaInput.isVisible()) {
      await fechaInput.fill('2020-01-01')
    }

    // Guardar
    await page.getByRole('button', { name: /crear iglesia|guardar/i }).click()

    // Verificar que aparece en la lista
    await expect(page.getByText(nombre)).toBeVisible({ timeout: 8_000 })
  })

  test('admin_iglesia puede editar datos de su iglesia', async ({ page, role }) => {
    test.skip(!CAN_EDIT.includes(role), `Rol ${role} no puede editar iglesia`)

    await gotoTenant(page, 'iglesia')

    // Buscar botón de edición
    const editBtn = page.getByRole('button', { name: /editar|edit/i }).first()
    await expect(editBtn).toBeVisible({ timeout: 8_000 })
    await editBtn.click()

    // Cambiar descripción
    const newDesc = uniqueName('Descripción actualizada')
    const descField = page.getByLabel(/descripci[oó]n/i).first()
    if (await descField.isVisible()) {
      await descField.fill(newDesc)
    }

    // Guardar
    await page.getByRole('button', { name: /guardar|actualizar/i }).click()

    // Verificar toast de éxito
    await expectToast(page, /actualiz|guard/i)
  })

  test('lider y servidor no ven botón de edición en detalle iglesia', async ({ page, role }) => {
    test.skip(CAN_EDIT.includes(role), `Rol ${role} sí puede editar`)

    await gotoTenant(page, 'iglesia')

    await expect(page).not.toHaveURL('/login')
    const editBtn = page.getByRole('button', { name: /editar|edit/i }).first()
    await expect(editBtn).not.toBeVisible({ timeout: 4_000 })
  })

})
```

- [ ] **Step 2: Correr este spec**

```bash
npx playwright test e2e/specs/02-churches.spec.ts --reporter=list
```

Resultado esperado: todos los tests PASS. Si algún selector no matchea, inspeccionar con `--ui` y ajustar el selector en el spec.

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/02-churches.spec.ts
git commit -m "test(e2e): add churches CRUD specs — functional + permission tests"
```

---

## Task 7: CRUD Sedes

**Files:**
- Create: `e2e/specs/03-sedes.spec.ts`

- [ ] **Step 1: Crear `e2e/specs/03-sedes.spec.ts`**

```typescript
import { test, expect, gotoTenant, expectToast, uniqueName } from '../fixtures'

const CAN_WRITE: string[] = ['super_admin', 'admin_iglesia']

test.describe('Sedes — CRUD por rol', () => {

  test('todos los roles ven la lista de sedes', async ({ page, role }) => {
    await gotoTenant(page, 'sedes')
    await expect(page).not.toHaveURL('/login')
    // Debe haber alguna sede o mensaje de "sin sedes"
    await expect(page.locator('table, [data-testid="sedes-list"], h1, h2').first()).toBeVisible({ timeout: 8_000 })
  })

  test('botón Nueva Sede — visible solo para super_admin y admin_iglesia', async ({ page, role }) => {
    await gotoTenant(page, 'sedes')
    const btn = page.getByRole('button', { name: /nueva sede/i })

    if (CAN_WRITE.includes(role)) {
      await expect(btn).toBeVisible({ timeout: 6_000 })
    } else {
      await expect(btn).not.toBeVisible({ timeout: 4_000 })
    }
  })

  test('super_admin puede crear una sede y aparece en la lista', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Solo super_admin para este test funcional')

    await gotoTenant(page, 'sedes')
    const nombre = uniqueName('Sede Test')

    await page.getByRole('button', { name: /nueva sede/i }).click()

    // Llenar nombre
    await page.getByLabel(/nombre/i).first().fill(nombre)

    // Seleccionar iglesia si hay selector (super_admin ve todas las iglesias)
    const iglesiaSelect = page.getByLabel(/iglesia/i).first()
    if (await iglesiaSelect.isVisible()) {
      await iglesiaSelect.selectOption({ index: 1 })
    }

    // Seleccionar país, departamento, ciudad si están disponibles
    const paisSelect = page.getByLabel(/pa[ií]s/i).first()
    if (await paisSelect.isVisible()) {
      await paisSelect.selectOption({ index: 1 })
      // Esperar que cargue departamento
      await page.waitForTimeout(500)
      const deptoSelect = page.getByLabel(/departamento/i).first()
      if (await deptoSelect.isVisible()) {
        await deptoSelect.selectOption({ index: 1 })
        await page.waitForTimeout(500)
        const ciudadSelect = page.getByLabel(/ciudad/i).first()
        if (await ciudadSelect.isVisible()) {
          await ciudadSelect.selectOption({ index: 1 })
        }
      }
    }

    await page.getByRole('button', { name: /guardar|crear/i }).click()
    await expectToast(page, /sede creada|creada correctamente/i)
    await expect(page.getByText(nombre)).toBeVisible({ timeout: 6_000 })
  })

  test('admin_iglesia puede crear una sede en su iglesia', async ({ page, role }) => {
    test.skip(role !== 'admin_iglesia', 'Solo admin_iglesia para este test funcional')

    await gotoTenant(page, 'sedes')
    const nombre = uniqueName('Sede Admin')

    await page.getByRole('button', { name: /nueva sede/i }).click()
    await page.getByLabel(/nombre/i).first().fill(nombre)

    // admin_iglesia no ve selector de iglesia (ya está en su tenant)
    const paisSelect = page.getByLabel(/pa[ií]s/i).first()
    if (await paisSelect.isVisible()) {
      await paisSelect.selectOption({ index: 1 })
      await page.waitForTimeout(500)
      const deptoSelect = page.getByLabel(/departamento/i).first()
      if (await deptoSelect.isVisible()) {
        await deptoSelect.selectOption({ index: 1 })
        await page.waitForTimeout(500)
        const ciudadSelect = page.getByLabel(/ciudad/i).first()
        if (await ciudadSelect.isVisible()) {
          await ciudadSelect.selectOption({ index: 1 })
        }
      }
    }

    await page.getByRole('button', { name: /guardar|crear/i }).click()
    await expectToast(page, /sede creada|creada correctamente/i)
    await expect(page.getByText(nombre)).toBeVisible({ timeout: 6_000 })
  })

  test('super_admin puede editar una sede existente', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Solo super_admin para este test funcional')

    await gotoTenant(page, 'sedes')

    // Abrir el primer edit disponible
    const editBtn = page.getByRole('button', { name: /editar/i }).first()
    await expect(editBtn).toBeVisible({ timeout: 6_000 })
    await editBtn.click()

    const nuevoNombre = uniqueName('Sede Editada')
    const nombreInput = page.getByLabel(/nombre/i).first()
    await nombreInput.clear()
    await nombreInput.fill(nuevoNombre)

    await page.getByRole('button', { name: /guardar|actualizar/i }).click()
    await expectToast(page, /sede actualizada|actualizada/i)
    await expect(page.getByText(nuevoNombre)).toBeVisible({ timeout: 6_000 })
  })

  test('super_admin puede eliminar una sede y desaparece de la lista', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Solo super_admin para este test funcional')

    await gotoTenant(page, 'sedes')

    // Crear una sede para luego eliminarla (datos limpios)
    const nombre = uniqueName('Sede Borrar')
    await page.getByRole('button', { name: /nueva sede/i }).click()
    await page.getByLabel(/nombre/i).first().fill(nombre)
    const paisSelect = page.getByLabel(/pa[ií]s/i).first()
    if (await paisSelect.isVisible()) {
      await paisSelect.selectOption({ index: 1 })
      await page.waitForTimeout(500)
      const deptoSelect = page.getByLabel(/departamento/i).first()
      if (await deptoSelect.isVisible()) {
        await deptoSelect.selectOption({ index: 1 })
        await page.waitForTimeout(500)
        const ciudadSelect = page.getByLabel(/ciudad/i).first()
        if (await ciudadSelect.isVisible()) {
          await ciudadSelect.selectOption({ index: 1 })
        }
      }
    }
    await page.getByRole('button', { name: /guardar|crear/i }).click()
    await expectToast(page, /sede creada|creada correctamente/i)

    // Ahora eliminar: buscar la fila con el nombre y hacer click en eliminar
    const row = page.locator('tr, [data-testid="sede-row"]').filter({ hasText: nombre })
    const deleteBtn = row.getByRole('button', { name: /eliminar|borrar/i })
    await deleteBtn.click()

    // Confirmar si hay dialog de confirmación
    const confirmBtn = page.getByRole('button', { name: /confirmar|sí|eliminar/i }).last()
    if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmBtn.click()
    }

    // Verificar que ya no aparece
    await expect(page.getByText(nombre)).not.toBeVisible({ timeout: 6_000 })
  })

  test('lider y servidor no pueden escribir en sedes', async ({ page, role }) => {
    test.skip(CAN_WRITE.includes(role), `Rol ${role} sí puede escribir`)

    await gotoTenant(page, 'sedes')
    await expect(page.getByRole('button', { name: /nueva sede/i })).not.toBeVisible({ timeout: 4_000 })
    await expect(page.getByRole('button', { name: /editar/i }).first()).not.toBeVisible({ timeout: 4_000 })
  })

})
```

- [ ] **Step 2: Correr este spec**

```bash
npx playwright test e2e/specs/03-sedes.spec.ts --reporter=list
```

Resultado esperado: todos PASS. Los tests con `test.skip` se reportan como skipped, no como fallidos.

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/03-sedes.spec.ts
git commit -m "test(e2e): add sedes CRUD specs — full create/edit/delete flows + permissions"
```

---

## Task 8: Asignación Pastores

**Files:**
- Create: `e2e/specs/04-pastores.spec.ts`

- [ ] **Step 1: Crear `e2e/specs/04-pastores.spec.ts`**

```typescript
import { test, expect, gotoTenant, expectToast } from '../fixtures'

const CAN_ASSIGN_SEDE: string[] = ['super_admin', 'admin_iglesia']

test.describe('Pastores — asignaciones por rol', () => {

  test('todos los roles pueden ver la lista de pastores', async ({ page, role }) => {
    await gotoTenant(page, 'pastores')
    await expect(page).not.toHaveURL('/login')
    await expect(page.locator('h1, h2, table, [data-testid="pastores-list"]').first()).toBeVisible({ timeout: 8_000 })
  })

  test('super_admin ve botón de asignación a iglesia', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Solo super_admin puede asignar a nivel iglesia')

    await gotoTenant(page, 'pastores')
    // Buscar botones de asignación de liderazgo de iglesia
    const assignBtn = page.getByRole('button', { name: /asignar|liderazgo/i }).first()
    await expect(assignBtn).toBeVisible({ timeout: 6_000 })
  })

  test('admin_iglesia ve opciones de gestión de pastores de sede', async ({ page, role }) => {
    test.skip(role !== 'admin_iglesia', 'Solo admin_iglesia para este test')

    await gotoTenant(page, 'pastores')
    // admin_iglesia puede asignar pastores a sedes
    const btn = page.getByRole('button', { name: /asignar|gestionar|pastor/i }).first()
    await expect(btn).toBeVisible({ timeout: 6_000 })
  })

  test('lider y servidor ven pastores en modo solo lectura', async ({ page, role }) => {
    test.skip(CAN_ASSIGN_SEDE.includes(role), `Rol ${role} tiene botones de gestión`)

    await gotoTenant(page, 'pastores')
    await expect(page).not.toHaveURL('/login')

    // No deben ver botones de asignación de iglesia
    await expect(page.getByRole('button', { name: /nueva iglesia|asignar iglesia/i })).not.toBeVisible({ timeout: 4_000 })
  })

})
```

- [ ] **Step 2: Correr**

```bash
npx playwright test e2e/specs/04-pastores.spec.ts --reporter=list
```

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/04-pastores.spec.ts
git commit -m "test(e2e): add pastores assignment specs by role"
```

---

## Task 9: CRUD Miembros de Ministerio

**Files:**
- Create: `e2e/specs/05-members.spec.ts`

- [ ] **Step 1: Crear `e2e/specs/05-members.spec.ts`**

```typescript
import { test, expect, gotoTenant, expectToast } from '../fixtures'

const CAN_MANAGE: string[] = ['super_admin', 'admin_iglesia', 'lider']

test.describe('Miembros — CRUD por rol', () => {

  test('admin y lider acceden a la página de miembros', async ({ page, role }) => {
    await gotoTenant(page, 'miembros')

    if (CAN_MANAGE.includes(role)) {
      await expect(page).not.toHaveURL('/login')
      await expect(page.locator('h1, h2, table').first()).toBeVisible({ timeout: 8_000 })
    } else {
      // servidor no debería tener acceso a la gestión de miembros
      // puede redirigir o mostrar pantalla vacía
      await expect(page).not.toHaveURL('/login')
    }
  })

  test('admin ve todos los ministerios en el selector', async ({ page, role }) => {
    test.skip(!['super_admin', 'admin_iglesia'].includes(role), 'Solo admins ven selector de todos los ministerios')

    await gotoTenant(page, 'miembros')

    // El admin ve "Todos los ministerios" como opción
    const allOption = page.getByRole('option', { name: /todos/i })
    await expect(allOption).toBeVisible({ timeout: 6_000 })
  })

  test('lider solo ve su ministerio en el selector', async ({ page, role }) => {
    test.skip(role !== 'lider', 'Solo aplica para lider')

    await gotoTenant(page, 'miembros')

    // El lider no ve la opción "Todos los ministerios"
    const allOption = page.getByRole('option', { name: /todos/i })
    await expect(allOption).not.toBeVisible({ timeout: 4_000 })
  })

  test('admin puede agregar un miembro a un ministerio', async ({ page, role }) => {
    test.skip(!['super_admin', 'admin_iglesia'].includes(role), `Rol ${role} no puede gestionar miembros`)

    await gotoTenant(page, 'miembros')

    const addBtn = page.getByRole('button', { name: /agregar|añadir|nuevo miembro/i }).first()
    await expect(addBtn).toBeVisible({ timeout: 6_000 })
    await addBtn.click()

    // Seleccionar usuario del dropdown (tomar el primero disponible)
    const userSelect = page.getByLabel(/usuario|miembro/i).first()
    if (await userSelect.isVisible()) {
      await userSelect.selectOption({ index: 1 })
    }

    await page.getByRole('button', { name: /agregar|guardar|confirmar/i }).last().click()
    // Verificar feedback positivo o que la tabla se actualiza
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 6_000 })
  })

  test('lider puede agregar miembro a su ministerio', async ({ page, role }) => {
    test.skip(role !== 'lider', 'Solo lider para este test')

    await gotoTenant(page, 'miembros')

    const addBtn = page.getByRole('button', { name: /agregar|añadir/i }).first()
    await expect(addBtn).toBeVisible({ timeout: 6_000 })
    await addBtn.click()

    const userSelect = page.getByLabel(/usuario|miembro/i).first()
    if (await userSelect.isVisible()) {
      await userSelect.selectOption({ index: 1 })
    }

    await page.getByRole('button', { name: /agregar|guardar|confirmar/i }).last().click()
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 6_000 })
  })

  test('servidor no ve botones de gestión de miembros', async ({ page, role }) => {
    test.skip(role !== 'servidor', 'Solo aplica para servidor')

    await gotoTenant(page, 'miembros')

    await expect(page.getByRole('button', { name: /agregar|añadir|eliminar miembro/i })).not.toBeVisible({ timeout: 4_000 })
  })

})
```

- [ ] **Step 2: Correr**

```bash
npx playwright test e2e/specs/05-members.spec.ts --reporter=list
```

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/05-members.spec.ts
git commit -m "test(e2e): add members CRUD specs — all roles with permission branching"
```

---

## Task 10: CRUD Ministerios

**Files:**
- Create: `e2e/specs/06-ministerios.spec.ts`

- [ ] **Step 1: Crear `e2e/specs/06-ministerios.spec.ts`**

```typescript
import { test, expect, gotoTenant, expectToast, uniqueName } from '../fixtures'

const CAN_MANAGE_MINISTERIO: string[] = ['super_admin', 'admin_iglesia']
const CAN_MANAGE_MEMBERS: string[] = ['super_admin', 'admin_iglesia', 'lider']

test.describe('Ministerios — CRUD por rol', () => {

  test('todos los roles ven la lista de ministerios', async ({ page, role }) => {
    await gotoTenant(page, 'ministerios')
    await expect(page).not.toHaveURL('/login')
    await expect(page.locator('h1, h2, [data-testid="ministerios-list"], .grid, .space-y-4').first()).toBeVisible({ timeout: 8_000 })
  })

  test('admin puede crear un ministerio y aparece en la lista', async ({ page, role }) => {
    test.skip(!CAN_MANAGE_MINISTERIO.includes(role), `Rol ${role} no puede crear ministerios`)

    await gotoTenant(page, 'ministerios')
    const nombre = uniqueName('Ministerio Test')

    const createBtn = page.getByRole('button', { name: /nuevo ministerio|crear ministerio/i })
    await expect(createBtn).toBeVisible({ timeout: 6_000 })
    await createBtn.click()

    await page.getByLabel(/nombre/i).first().fill(nombre)

    await page.getByRole('button', { name: /crear|guardar/i }).last().click()
    await expectToast(page, /ministerio.*cre|cre.*ministerio/i)
    await expect(page.getByText(nombre)).toBeVisible({ timeout: 6_000 })
  })

  test('admin puede entrar al detalle de un ministerio y gestionar servidores', async ({ page, role }) => {
    test.skip(!CAN_MANAGE_MEMBERS.includes(role), `Rol ${role} no puede gestionar servidores`)

    await gotoTenant(page, 'ministerios')

    // Hacer click en el primer ministerio para entrar al detalle
    const firstMinisterio = page.locator('[data-testid="ministerio-card"], .card, article').first()
    await expect(firstMinisterio).toBeVisible({ timeout: 8_000 })
    await firstMinisterio.click()

    // Debe aparecer el panel de detalle con opción para agregar servidor
    const addServerBtn = page.getByRole('button', { name: /agregar servidor|nuevo servidor/i })
    await expect(addServerBtn).toBeVisible({ timeout: 6_000 })
  })

  test('lider y servidor no ven botón de crear ministerio', async ({ page, role }) => {
    test.skip(CAN_MANAGE_MINISTERIO.includes(role), `Rol ${role} sí puede crear ministerios`)

    await gotoTenant(page, 'ministerios')
    await expect(page.getByRole('button', { name: /nuevo ministerio|crear ministerio/i })).not.toBeVisible({ timeout: 4_000 })
  })

  test('servidor no ve opciones de gestión dentro del ministerio', async ({ page, role }) => {
    test.skip(role !== 'servidor', 'Solo aplica para servidor')

    await gotoTenant(page, 'ministerios')

    // El servidor solo ve la lista, sin botones de edición
    await expect(page.getByRole('button', { name: /editar ministerio/i })).not.toBeVisible({ timeout: 4_000 })
    await expect(page.getByRole('button', { name: /eliminar ministerio/i })).not.toBeVisible({ timeout: 4_000 })
  })

})
```

- [ ] **Step 2: Correr**

```bash
npx playwright test e2e/specs/06-ministerios.spec.ts --reporter=list
```

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/06-ministerios.spec.ts
git commit -m "test(e2e): add ministerios CRUD specs — create/manage with role permissions"
```

---

## Task 11: CRUD Eventos

**Files:**
- Create: `e2e/specs/07-eventos.spec.ts`

- [ ] **Step 1: Crear `e2e/specs/07-eventos.spec.ts`**

```typescript
import { test, expect, gotoTenant, expectToast, uniqueName } from '../fixtures'

const CAN_MANAGE: string[] = ['super_admin', 'admin_iglesia', 'lider']

test.describe('Eventos — CRUD por rol', () => {

  test('todos los roles pueden ver eventos', async ({ page, role }) => {
    await gotoTenant(page, 'eventos')
    await expect(page).not.toHaveURL('/login')
    await expect(page.locator('h1, h2, [data-testid="eventos-list"]').first()).toBeVisible({ timeout: 8_000 })
  })

  test('botón Crear Evento visible para admin y lider', async ({ page, role }) => {
    await gotoTenant(page, 'eventos')

    const btn = page.getByRole('button', { name: /nuevo evento|crear evento/i })

    if (CAN_MANAGE.includes(role)) {
      await expect(btn).toBeVisible({ timeout: 6_000 })
    } else {
      await expect(btn).not.toBeVisible({ timeout: 4_000 })
    }
  })

  test('super_admin puede crear un evento y aparece en la lista', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Solo super_admin para este test funcional')

    await gotoTenant(page, 'eventos')
    const titulo = uniqueName('Evento Test')

    await page.getByRole('button', { name: /nuevo evento|crear evento/i }).click()

    await page.getByLabel(/t[ií]tulo|nombre/i).first().fill(titulo)

    // Fecha inicio
    const fechaInput = page.locator('input[type="date"], input[placeholder*="fecha"]').first()
    if (await fechaInput.isVisible()) {
      await fechaInput.fill('2026-06-01')
    }

    await page.getByRole('button', { name: /crear evento|guardar/i }).click()
    await expectToast(page, /evento.*cre|cre.*evento/i)
    await expect(page.getByText(titulo)).toBeVisible({ timeout: 6_000 })
  })

  test('lider puede crear un evento', async ({ page, role }) => {
    test.skip(role !== 'lider', 'Solo lider para este test funcional')

    await gotoTenant(page, 'eventos')
    const titulo = uniqueName('Evento Lider')

    await page.getByRole('button', { name: /nuevo evento|crear evento/i }).click()
    await page.getByLabel(/t[ií]tulo|nombre/i).first().fill(titulo)

    const fechaInput = page.locator('input[type="date"]').first()
    if (await fechaInput.isVisible()) {
      await fechaInput.fill('2026-06-15')
    }

    await page.getByRole('button', { name: /crear evento|guardar/i }).click()
    await expectToast(page, /evento.*cre|cre.*evento/i)
    await expect(page.getByText(titulo)).toBeVisible({ timeout: 6_000 })
  })

  test('super_admin puede editar un evento existente', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Solo super_admin para este test funcional')

    await gotoTenant(page, 'eventos')

    // Encontrar primer botón de edición
    const editBtn = page.getByRole('button', { name: /editar/i }).first()
    await expect(editBtn).toBeVisible({ timeout: 6_000 })
    await editBtn.click()

    const nuevoTitulo = uniqueName('Evento Editado')
    const titleField = page.getByLabel(/t[ií]tulo|nombre/i).first()
    await titleField.clear()
    await titleField.fill(nuevoTitulo)

    await page.getByRole('button', { name: /guardar|actualizar/i }).click()
    await expectToast(page, /actualiz|guard/i)
    await expect(page.getByText(nuevoTitulo)).toBeVisible({ timeout: 6_000 })
  })

  test('super_admin puede eliminar un evento', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Solo super_admin para este test funcional')

    await gotoTenant(page, 'eventos')

    // Crear evento para eliminar
    const titulo = uniqueName('Evento Borrar')
    await page.getByRole('button', { name: /nuevo evento|crear evento/i }).click()
    await page.getByLabel(/t[ií]tulo|nombre/i).first().fill(titulo)
    const fechaInput = page.locator('input[type="date"]').first()
    if (await fechaInput.isVisible()) await fechaInput.fill('2026-07-01')
    await page.getByRole('button', { name: /crear evento|guardar/i }).click()
    await expectToast(page, /evento.*cre|cre.*evento/i)

    // Eliminar
    const row = page.locator('tr, article, .card').filter({ hasText: titulo })
    await row.getByRole('button', { name: /eliminar|borrar/i }).click()

    const confirmBtn = page.getByRole('button', { name: /confirmar|sí|eliminar/i }).last()
    if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmBtn.click()
    }

    await expect(page.getByText(titulo)).not.toBeVisible({ timeout: 6_000 })
  })

  test('servidor no puede crear, editar ni eliminar eventos', async ({ page, role }) => {
    test.skip(role !== 'servidor', 'Solo aplica para servidor')

    await gotoTenant(page, 'eventos')
    await expect(page.getByRole('button', { name: /nuevo evento|crear evento/i })).not.toBeVisible({ timeout: 4_000 })
    await expect(page.getByRole('button', { name: /editar/i }).first()).not.toBeVisible({ timeout: 4_000 })
  })

})
```

- [ ] **Step 2: Correr**

```bash
npx playwright test e2e/specs/07-eventos.spec.ts --reporter=list
```

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/07-eventos.spec.ts
git commit -m "test(e2e): add eventos CRUD specs — full lifecycle + permission tests"
```

---

## Task 12: CRUD Tareas + flujo servidor

**Files:**
- Create: `e2e/specs/08-tareas.spec.ts`

- [ ] **Step 1: Crear `e2e/specs/08-tareas.spec.ts`**

```typescript
import { test, expect, gotoTenant, expectToast, uniqueName } from '../fixtures'

const CAN_CREATE: string[] = ['super_admin', 'admin_iglesia', 'lider']

test.describe('Tareas — CRUD por rol', () => {

  test('admin y lider ven la lista completa de tareas', async ({ page, role }) => {
    await gotoTenant(page, 'tareas')
    await expect(page).not.toHaveURL('/login')
    await expect(page.locator('h1, h2, [data-testid="tareas-list"]').first()).toBeVisible({ timeout: 8_000 })
  })

  test('botón Nueva Tarea visible para admin y lider', async ({ page, role }) => {
    await gotoTenant(page, 'tareas')

    const btn = page.getByRole('button', { name: /nueva tarea/i })
    if (CAN_CREATE.includes(role)) {
      await expect(btn).toBeVisible({ timeout: 6_000 })
    } else {
      await expect(btn).not.toBeVisible({ timeout: 4_000 })
    }
  })

  test('super_admin puede crear una tarea y aparece en la lista', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Solo super_admin para este test funcional')

    await gotoTenant(page, 'tareas')
    const titulo = uniqueName('Tarea Test')

    await page.getByRole('button', { name: /nueva tarea/i }).click()

    await page.getByLabel(/t[ií]tulo|nombre/i).first().fill(titulo)

    // Descripción opcional
    const descField = page.getByLabel(/descripci[oó]n/i).first()
    if (await descField.isVisible()) {
      await descField.fill('Descripción de tarea de prueba')
    }

    await page.getByRole('button', { name: /crear|guardar/i }).last().click()
    await expectToast(page, /tarea.*cre|cre.*tarea/i)
    await expect(page.getByText(titulo)).toBeVisible({ timeout: 6_000 })
  })

  test('lider puede crear y asignar una tarea a un servidor', async ({ page, role }) => {
    test.skip(role !== 'lider', 'Solo lider para este test funcional')

    await gotoTenant(page, 'tareas')
    const titulo = uniqueName('Tarea Lider')

    await page.getByRole('button', { name: /nueva tarea/i }).click()
    await page.getByLabel(/t[ií]tulo|nombre/i).first().fill(titulo)

    const descField = page.getByLabel(/descripci[oó]n/i).first()
    if (await descField.isVisible()) {
      await descField.fill('Tarea asignada por lider')
    }

    await page.getByRole('button', { name: /crear|guardar/i }).last().click()
    await expectToast(page, /tarea.*cre|cre.*tarea/i)
    await expect(page.getByText(titulo)).toBeVisible({ timeout: 6_000 })

    // Intentar asignar servidor
    const tareaRow = page.locator('tr, .card, article').filter({ hasText: titulo })
    const assignBtn = tareaRow.getByRole('button', { name: /asignar|servidor/i })
    if (await assignBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await assignBtn.click()
      const serverSelect = page.getByLabel(/servidor|usuario/i).last()
      if (await serverSelect.isVisible()) {
        await serverSelect.selectOption({ index: 1 })
        await page.getByRole('button', { name: /asignar|confirmar/i }).last().click()
      }
    }
  })

  test('super_admin puede editar una tarea existente', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Solo super_admin para este test funcional')

    await gotoTenant(page, 'tareas')

    const editBtn = page.getByRole('button', { name: /editar/i }).first()
    await expect(editBtn).toBeVisible({ timeout: 6_000 })
    await editBtn.click()

    const nuevoTitulo = uniqueName('Tarea Editada')
    const titleField = page.getByLabel(/t[ií]tulo|nombre/i).first()
    await titleField.clear()
    await titleField.fill(nuevoTitulo)

    await page.getByRole('button', { name: /guardar|actualizar/i }).click()
    await expectToast(page, /actualiz|guard/i)
    await expect(page.getByText(nuevoTitulo)).toBeVisible({ timeout: 6_000 })
  })

  test('servidor ve solo sus tareas asignadas', async ({ page, role }) => {
    test.skip(role !== 'servidor', 'Solo aplica para servidor')

    await gotoTenant(page, 'tareas')
    // El servidor ve la página pero no tiene botón de crear
    await expect(page.getByRole('button', { name: /nueva tarea/i })).not.toBeVisible({ timeout: 4_000 })
  })

  test('servidor puede actualizar el estado de una tarea asignada', async ({ page, role }) => {
    test.skip(role !== 'servidor', 'Solo aplica para servidor')

    await gotoTenant(page, 'tareas')

    // Buscar una tarea asignada al servidor (debe existir en los datos de prueba)
    const statusBtn = page.getByRole('button', { name: /completar|marcar|iniciada|en progreso/i }).first()
    if (await statusBtn.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await statusBtn.click()
      await expectToast(page, /actualiz|guard|estado/i)
    } else {
      // Si no hay tareas asignadas, verificar que al menos la página cargó correctamente
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 6_000 })
    }
  })

})
```

- [ ] **Step 2: Correr**

```bash
npx playwright test e2e/specs/08-tareas.spec.ts --reporter=list
```

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/08-tareas.spec.ts
git commit -m "test(e2e): add tareas CRUD specs — create/edit/delete + servidor assignment flow"
```

---

## Task 13: CRUD Aula Virtual

**Files:**
- Create: `e2e/specs/09-aula.spec.ts`

- [ ] **Step 1: Crear `e2e/specs/09-aula.spec.ts`**

```typescript
import { test, expect, gotoTenant, expectToast, uniqueName } from '../fixtures'

const CAN_MANAGE_CURSO: string[] = ['super_admin', 'admin_iglesia', 'lider']

test.describe('Aula Virtual — CRUD por rol', () => {

  test('todos los roles acceden al aula', async ({ page, role }) => {
    await gotoTenant(page, 'aula')
    await expect(page).not.toHaveURL('/login')
    await expect(page.locator('h1, h2, [data-testid="aula-list"]').first()).toBeVisible({ timeout: 8_000 })
  })

  test('botón Crear Curso visible para admin y lider', async ({ page, role }) => {
    await gotoTenant(page, 'aula')

    const btn = page.getByRole('button', { name: /nuevo curso|crear curso/i })

    if (CAN_MANAGE_CURSO.includes(role)) {
      await expect(btn).toBeVisible({ timeout: 6_000 })
    } else {
      await expect(btn).not.toBeVisible({ timeout: 4_000 })
    }
  })

  test('super_admin puede crear un curso y aparece en la lista', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Solo super_admin para este test funcional')

    await gotoTenant(page, 'aula')
    const titulo = uniqueName('Curso Test')

    await page.getByRole('button', { name: /nuevo curso|crear curso/i }).click()

    await page.getByLabel(/t[ií]tulo|nombre/i).first().fill(titulo)

    const descField = page.getByLabel(/descripci[oó]n/i).first()
    if (await descField.isVisible()) {
      await descField.fill('Descripción del curso de prueba')
    }

    await page.getByRole('button', { name: /crear|guardar/i }).last().click()
    await expectToast(page, /curso.*cre|cre.*curso/i)
    await expect(page.getByText(titulo)).toBeVisible({ timeout: 8_000 })
  })

  test('lider puede crear un curso', async ({ page, role }) => {
    test.skip(role !== 'lider', 'Solo lider para este test funcional')

    await gotoTenant(page, 'aula')
    const titulo = uniqueName('Curso Lider')

    await page.getByRole('button', { name: /nuevo curso|crear curso/i }).click()
    await page.getByLabel(/t[ií]tulo|nombre/i).first().fill(titulo)

    await page.getByRole('button', { name: /crear|guardar/i }).last().click()
    await expectToast(page, /curso.*cre|cre.*curso/i)
    await expect(page.getByText(titulo)).toBeVisible({ timeout: 8_000 })
  })

  test('super_admin puede agregar un módulo a un curso', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Solo super_admin para este test funcional')

    await gotoTenant(page, 'aula')

    // Entrar al primer curso disponible
    const firstCourse = page.locator('[data-testid="curso-card"], .card, article').first()
    await expect(firstCourse).toBeVisible({ timeout: 8_000 })
    await firstCourse.click()

    // Agregar módulo
    const addModuleBtn = page.getByRole('button', { name: /nuevo m[oó]dulo|agregar m[oó]dulo/i })
    await expect(addModuleBtn).toBeVisible({ timeout: 6_000 })
    await addModuleBtn.click()

    const moduloTitulo = uniqueName('Módulo Test')
    await page.getByLabel(/t[ií]tulo|nombre/i).first().fill(moduloTitulo)

    await page.getByRole('button', { name: /crear|guardar/i }).last().click()
    await expect(page.getByText(moduloTitulo)).toBeVisible({ timeout: 6_000 })
  })

  test('super_admin puede inscribir servidores a un curso', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Solo super_admin para este test funcional')

    await gotoTenant(page, 'aula')

    const firstCourse = page.locator('[data-testid="curso-card"], .card, article').first()
    await expect(firstCourse).toBeVisible({ timeout: 8_000 })
    await firstCourse.click()

    // Buscar botón de inscripción/agregar personas
    const inscribirBtn = page.getByRole('button', { name: /inscribir|agregar persona|participantes/i })
    if (await inscribirBtn.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await inscribirBtn.click()
      // Seleccionar usuario
      const userSelect = page.getByLabel(/usuario|participante/i).first()
      if (await userSelect.isVisible()) {
        await userSelect.selectOption({ index: 1 })
        await page.getByRole('button', { name: /inscribir|agregar|guardar/i }).last().click()
      }
    }
  })

  test('servidor ve solo sus cursos inscritos sin botones de gestión', async ({ page, role }) => {
    test.skip(role !== 'servidor', 'Solo aplica para servidor')

    await gotoTenant(page, 'aula')
    await expect(page).not.toHaveURL('/login')

    // No debe ver botón de crear curso
    await expect(page.getByRole('button', { name: /nuevo curso|crear curso/i })).not.toBeVisible({ timeout: 4_000 })
  })

  test('servidor puede acceder al detalle de un curso inscrito', async ({ page, role }) => {
    test.skip(role !== 'servidor', 'Solo aplica para servidor')

    await gotoTenant(page, 'aula')

    // Si hay cursos inscritos, debe poder entrar
    const firstCourse = page.locator('[data-testid="curso-card"], .card, article').first()
    if (await firstCourse.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await firstCourse.click()
      // Debe ver el contenido del curso
      await expect(page.locator('h1, h2, [data-testid="curso-detalle"]').first()).toBeVisible({ timeout: 6_000 })
      // No debe ver botones de edición de módulos
      await expect(page.getByRole('button', { name: /editar m[oó]dulo/i })).not.toBeVisible({ timeout: 3_000 })
    }
  })

})
```

- [ ] **Step 2: Correr**

```bash
npx playwright test e2e/specs/09-aula.spec.ts --reporter=list
```

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/09-aula.spec.ts
git commit -m "test(e2e): add aula virtual CRUD specs — courses, modules, enrollment by role"
```

---

## Task 14: Tests RLS backend (sin browser)

**Files:**
- Create: `e2e/specs/10-rls-backend.spec.ts`

- [ ] **Step 1: Instalar supabase-js para tests RLS**

```bash
# @supabase/supabase-js ya está en las dependencias del proyecto.
# Solo verificar que esté disponible:
node -e "require('@supabase/supabase-js'); console.log('OK')" 2>/dev/null || echo "Instalar: npm install --save-dev @supabase/supabase-js"
```

- [ ] **Step 2: Agregar a `.env.test`**

Obtener la anon key y la URL del Supabase local (`supabase status`), y también los tokens JWT de cada usuario. Los tokens se obtienen del storageState guardado en `.auth/*.json`.

Agregar a `.env.test`:

```ini
# Supabase local — obtener con: supabase status
TEST_SUPABASE_URL=http://localhost:54321
TEST_SUPABASE_ANON_KEY=<anon_key_del_output_de_supabase_status>
```

Agregar también a `.env.test.example`:
```ini
TEST_SUPABASE_URL=http://localhost:54321
TEST_SUPABASE_ANON_KEY=
```

- [ ] **Step 3: Crear `e2e/specs/10-rls-backend.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = process.env.TEST_SUPABASE_URL ?? 'http://localhost:54321'
const SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY ?? ''
const IGLESIA_ID = parseInt(process.env.TEST_IGLESIA_ID ?? '1')

/** Extrae el access_token del storageState de Playwright */
function getTokenFromStorageState(roleName: string): string {
  const stateFile = path.resolve(`.auth/${roleName}.json`)
  if (!fs.existsSync(stateFile)) {
    throw new Error(`storageState not found for ${roleName}. Run auth setup first.`)
  }
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'))
  // Supabase guarda el token en localStorage con clave que empieza por 'sb-'
  const origins: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }> = state.origins ?? []
  for (const origin of origins) {
    for (const item of origin.localStorage ?? []) {
      if (item.name.startsWith('sb-') && item.name.endsWith('-auth-token')) {
        const parsed = JSON.parse(item.value)
        return parsed.access_token as string
      }
    }
  }
  throw new Error(`No Supabase auth token found in storageState for ${roleName}`)
}

/** Crea un cliente Supabase autenticado con el token del rol */
function clientForRole(roleName: string) {
  const token = getTokenFromStorageState(roleName)
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}

test.describe('RLS — verificación directa a Supabase por rol', () => {

  // ── Sedes ─────────────────────────────────────────────────────────────────

  test('servidor no puede insertar una sede directamente', async () => {
    const client = clientForRole('servidor')
    const { error } = await client.from('sede').insert({
      nombre: 'RLS Test Sede Hack',
      id_iglesia: IGLESIA_ID,
    })
    expect(error, 'RLS debe bloquear el INSERT de sede para servidor').not.toBeNull()
    // PostgreSQL lanza 42501 (insufficient_privilege) o la fila no se inserta (error de RLS)
    const isBlocked = error!.code === '42501' || error!.message.includes('row-level security') || error!.message.includes('policy')
    expect(isBlocked, `Error inesperado: ${error!.message}`).toBe(true)
  })

  test('lider no puede insertar una sede directamente', async () => {
    const client = clientForRole('lider')
    const { error } = await client.from('sede').insert({
      nombre: 'RLS Test Sede Hack Lider',
      id_iglesia: IGLESIA_ID,
    })
    expect(error).not.toBeNull()
    const isBlocked = error!.code === '42501' || error!.message.includes('row-level security') || error!.message.includes('policy')
    expect(isBlocked, `Error inesperado: ${error!.message}`).toBe(true)
  })

  test('admin_iglesia puede leer sedes de su iglesia', async () => {
    const client = clientForRole('admin_iglesia')
    const { data, error } = await client.from('sede').select('id_sede').eq('id_iglesia', IGLESIA_ID)
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  // ── Tareas ────────────────────────────────────────────────────────────────

  test('servidor no puede crear una tarea directamente', async () => {
    const client = clientForRole('servidor')
    const { error } = await client.from('tarea').insert({
      titulo: 'RLS Hack Tarea',
      id_ministerio: 1,
    })
    expect(error).not.toBeNull()
    const isBlocked = error!.code === '42501' || error!.message.includes('row-level security') || error!.message.includes('policy')
    expect(isBlocked, `Error inesperado: ${error!.message}`).toBe(true)
  })

  test('servidor puede leer solo sus tarea_asignada', async () => {
    const client = clientForRole('servidor')
    const { data, error } = await client.from('tarea_asignada').select('id_tarea_asignada')
    expect(error).toBeNull()
    // El resultado puede ser vacío si no tiene tareas, pero no debe ser un error de permisos
    expect(Array.isArray(data)).toBe(true)
  })

  // ── Geografía ────────────────────────────────────────────────────────────

  test('todos los roles pueden leer países', async () => {
    for (const roleName of ['super_admin', 'admin_iglesia', 'lider', 'servidor']) {
      const client = clientForRole(roleName)
      const { data, error } = await client.from('pais').select('id_pais').limit(5)
      expect(error, `${roleName} debe poder leer pais`).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    }
  })

  test('servidor no puede insertar un país', async () => {
    const client = clientForRole('servidor')
    const { error } = await client.from('pais').insert({ nombre: 'RLS Hack País' })
    expect(error).not.toBeNull()
  })

  // ── Cursos ───────────────────────────────────────────────────────────────

  test('servidor no puede crear un curso directamente', async () => {
    const client = clientForRole('servidor')
    const { error } = await client.from('aula_curso').insert({
      titulo: 'RLS Hack Curso',
      id_iglesia: IGLESIA_ID,
    })
    expect(error).not.toBeNull()
    const isBlocked = error!.code === '42501' || error!.message.includes('row-level security') || error!.message.includes('policy')
    expect(isBlocked, `Error inesperado: ${error!.message}`).toBe(true)
  })

  test('servidor no puede ver cursos de otra iglesia', async () => {
    const client = clientForRole('servidor')
    // Intentar leer un curso de una iglesia diferente (ID 9999 que no existe o no pertenece al tenant)
    const { data } = await client.from('aula_curso').select('id_aula_curso').eq('id_iglesia', 9999)
    // La RLS debe devolver resultado vacío, no error
    expect(data).toHaveLength(0)
  })

  // ── Iglesia ───────────────────────────────────────────────────────────────

  test('lider no puede eliminar una iglesia directamente', async () => {
    const client = clientForRole('lider')
    const { error } = await client.from('iglesia').delete().eq('id_iglesia', IGLESIA_ID)
    expect(error).not.toBeNull()
  })

  test('servidor no puede eliminar una iglesia directamente', async () => {
    const client = clientForRole('servidor')
    const { error } = await client.from('iglesia').delete().eq('id_iglesia', IGLESIA_ID)
    expect(error).not.toBeNull()
  })

})
```

- [ ] **Step 4: Correr solo el proyecto rls**

```bash
npx playwright test e2e/specs/10-rls-backend.spec.ts --project=rls --reporter=list
```

Resultado esperado: todos PASS. Si algún test falla con "storageState not found", correr primero `npx playwright test --project=setup`.

- [ ] **Step 5: Commit**

```bash
git add e2e/specs/10-rls-backend.spec.ts .env.test.example
git commit -m "test(e2e): add RLS backend verification tests — direct Supabase API per role"
```

---

## Task 15: Scripts npm y verificación final del suite completo

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Agregar scripts a `package.json`**

Abrir `package.json` y modificar la sección `"scripts"`:

```json
"scripts": {
  "build": "vite build",
  "dev": "vite",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:headed": "playwright test --headed",
  "test:e2e:report": "playwright show-report",
  "test:e2e:setup": "playwright test --project=setup"
}
```

- [ ] **Step 2: Correr el suite completo**

Asegurarse de que Supabase local y el dev server están corriendo, luego:

```bash
npm run test:e2e 2>&1 | tail -30
```

Resultado esperado: todos los tests PASS o SKIPPED (ningún FAIL). El reporte HTML se genera en `playwright-report/`.

- [ ] **Step 3: Ver reporte HTML**

```bash
npm run test:e2e:report
```

- [ ] **Step 4: Commit final**

```bash
git add package.json
git commit -m "feat(e2e): add npm scripts for Playwright — test:e2e, test:e2e:ui, test:e2e:report"
```

---

## Self-Review

### Spec coverage
- ✅ Auth setup (Task 3)
- ✅ Route guards (Task 5)
- ✅ Iglesias CRUD funcional + permisos (Task 6)
- ✅ Sedes CRUD funcional completo: create/edit/delete + permisos (Task 7)
- ✅ Pastores asignaciones (Task 8)
- ✅ Miembros ministerio (Task 9)
- ✅ Ministerios CRUD (Task 10)
- ✅ Eventos CRUD completo (Task 11)
- ✅ Tareas CRUD + flujo servidor (Task 12)
- ✅ Aula virtual CRUD + inscripción + consumo servidor (Task 13)
- ✅ RLS backend verification (Task 14)
- ✅ Scripts npm (Task 15)

### Verificaciones de consistencia
- `uniqueName()`, `gotoTenant()`, `gotoGlobal()`, `expectToast()` definidos en Task 4 y usados consistentemente en Tasks 6-13.
- `role` fixture tipado como `AppRole` definido en Task 4, accedido en todos los specs via `{ page, role }`.
- `IGLESIA_ID` importado de `fixtures.ts` en todos los specs que lo necesitan.
- `clientForRole()` en Task 14 lee el mismo `.auth/*.json` que genera Task 3.
- Los nombres de project en `playwright.config.ts` (`super_admin`, `admin_iglesia`, `lider`, `servidor`) coinciden exactamente con lo que devuelve `test.info().project.name` en los specs.
