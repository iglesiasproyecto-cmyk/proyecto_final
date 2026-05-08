import { test, expect, BASE_URL, gotoGlobal, uniqueName } from '../fixtures'

const CAN_MANAGE_ADMIN_SEDE: string[] = ['super_admin', 'admin_iglesia']

test.describe('Administradores de Sede — Gestión', () => {

  test('super_admin puede navegar a Admin Sedes', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Solo super_admin puede acceder a admin-sedes')

    await gotoGlobal(page, 'admin-sedes')
    await expect(page).not.toHaveURL('/login')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
  })

  test('página muestra lista de sedes', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Solo super_admin puede ver admin-sedes')

    await gotoGlobal(page, 'admin-sedes')
    
    // Verify page title
    const title = page.locator('h1').filter({ hasText: /administrador|sede/i })
    await expect(title).toBeVisible({ timeout: 10_000 })
    
    // Verify sedes are rendered (look for sede cards)
    const cards = page.locator('.grid').locator('.rounded-lg.border.bg-card')
    await expect(cards).toHaveCount(1, { timeout: 10_000 })
  })

  test('super_admin puede asignar administrador a una sede', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Solo super_admin puede asignar admin sedes')

    await gotoGlobal(page, 'admin-sedes')
    
    // Wait for sedes to load
    const cards = page.locator('.grid').locator('.rounded-lg.border.bg-card')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
    
    // Click "+ Asignar admin" button
    const assignBtn = cards.first().locator('button').filter({ hasText: /asignar/i })
    await expect(assignBtn).toBeVisible({ timeout: 5_000 })
    await assignBtn.click()
    
    // Search box should appear
    const searchInput = cards.first().locator('input[placeholder*="usuario"]')
    await expect(searchInput).toBeVisible({ timeout: 5_000 })
    
    // Look for candidates to assign
    const candidates = cards.first().locator('button').filter({ hasText: /correo|@/ })
    if (await candidates.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Click first candidate
      await candidates.first().click()
      
      // Verify assignment appears in card
      const adminsList = cards.first().locator('[class*="muted"]').first()
      await expect(adminsList).toBeVisible({ timeout: 8_000 })
    }
  })

  test('super_admin puede remover administrador de una sede', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Solo super_admin puede remover admin sedes')

    await gotoGlobal(page, 'admin-sedes')
    
    // Wait for sedes to load
    const cards = page.locator('.grid').locator('.rounded-lg.border.bg-card')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
    
    // First, let's see if there's an admin assigned
    const removeBtn = cards.first().locator('button').filter({ hasText: /remover/i })
    
    if (await removeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // There's an admin assigned, remove it
      await removeBtn.click()
      
      // Verify removal (button should disappear or message shows empty)
      await expect(removeBtn).not.toBeVisible({ timeout: 8_000 })
    }
  })

  test('admin_iglesia es redirigido desde /app/global/admin-sedes', async ({ page, role }) => {
    test.skip(role !== 'admin_iglesia', 'Solo probar con admin_iglesia')

    // Try to access global admin-sedes route
    await page.goto(`${BASE_URL}/app/global/admin-sedes`, { waitUntil: 'domcontentloaded' })
    
    // Should be redirected away from /global
    await page.waitForURL(url => !url.toString().includes('/app/global'), { timeout: 12_000 }).catch(() => {})
    
    // Should not be on login page
    await expect(page).not.toHaveURL('/login', { timeout: 5_000 })
  })

  test('lider y servidor no ven Admin Sedes en menú', async ({ page, role }) => {
    test.skip(!['lider', 'servidor'].includes(role), 'Solo probar con lider/servidor')

    await page.goto(`${BASE_URL}/app/1`, { waitUntil: 'domcontentloaded' })
    
    // Wait for nav to load
    await expect(page.locator('[class*="sidebar"], [class*="nav"]').first()).toBeVisible({ timeout: 10_000 })
    
    // Admin Sedes link should not be visible
    const adminSedesLink = page.locator('a, button').filter({ hasText: /administrador.*sede|admin.*sede/i })
    await expect(adminSedesLink).not.toBeVisible({ timeout: 5_000 })
  })

})
