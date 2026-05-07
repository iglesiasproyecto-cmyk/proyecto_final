import { test, expect, BASE_URL, IGLESIA_ID, gotoGlobal, gotoTenant } from '../fixtures'

test.describe('Route guards por rol', () => {

  test('solo super_admin accede a /app/global', async ({ page, role }) => {
    await page.goto(`${BASE_URL}/app/global`)

    if (role === 'super_admin') {
      // Debe quedarse en la ruta global (dashboard global)
      await expect(page).toHaveURL(/\/app\/global/, { timeout: 8_000 })
    } else {
      // El redirect es asíncrono (depende de authLoading) — esperar hasta que salga de /app/global
      await page.waitForURL(url => !url.toString().includes('/app/global'), { timeout: 12_000 })
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

  test('super_admin ve sección Gestión Global en sidebar', async ({ page, role }) => {
    // Navigate to global dashboard — super_admin stays, others redirect
    await page.goto(`${BASE_URL}/app/global`)

    if (role === 'super_admin') {
      // Sidebar debe mostrar "Gestión Global" y el botón Iglesias
      await expect(page.getByRole('button', { name: /iglesias/i }).first()).toBeVisible({ timeout: 15_000 })
    } else {
      // Otros roles son redirigidos — solo verificamos que salieron de /global
      await page.waitForURL(url => !url.toString().includes('/app/global'), { timeout: 12_000 })
      await expect(page).not.toHaveURL('/login')
    }
  })

})
