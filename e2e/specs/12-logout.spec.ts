import { test, expect, gotoTenant } from '../fixtures'

test.describe('Cerrar sesión', () => {
  test('el botón del header no recarga la página', async ({ page }) => {
    await page.addInitScript(() => {
      const key = '__e2e_nav_count'
      const current = Number(localStorage.getItem(key) || '0')
      localStorage.setItem(key, String(current + 1))
    })

    await gotoTenant(page, 'perfil')

    const before = await page.evaluate(() => Number(localStorage.getItem('__e2e_nav_count') || '0'))

    await page.locator('header button').filter({ has: page.locator('svg.lucide-log-out') }).click()
    await page.waitForURL(/\/login/, { timeout: 15_000 })

    const after = await page.evaluate(() => Number(localStorage.getItem('__e2e_nav_count') || '0'))
    expect(after, 'Cerrar sesión no debería recargar el documento').toBe(before)
  })
})
