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
