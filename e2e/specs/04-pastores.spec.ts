import { test, expect, gotoTenant } from '../fixtures'

test.describe('Pastores — asignaciones por rol', () => {

  test('todos los roles pueden ver pastores', async ({ page, role }) => {
    await gotoTenant(page, 'pastores')
    await expect(page).not.toHaveURL('/login')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
  })

  test('super_admin ve botones de asignación de liderazgo', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Solo super_admin puede asignar iglesias')

    await gotoTenant(page, 'pastores')
    // super_admin sees "Nuevo Pastor" button in the directory tab
    const actionBtn = page.getByRole('button', { name: /nuevo pastor/i }).first()
    await expect(actionBtn).toBeVisible({ timeout: 10_000 })
  })

  test('admin_iglesia puede gestionar pastores de sede', async ({ page, role }) => {
    test.skip(role !== 'admin_iglesia', 'Solo admin_iglesia para este test')

    await gotoTenant(page, 'pastores')
    // admin_iglesia can assign pastors to sedes
    const btn = page.getByRole('button', { name: /asignar|gestionar|pastor|sede/i }).first()
    await expect(btn).toBeVisible({ timeout: 10_000 })
  })

  test('lider y servidor ven pastores en solo lectura', async ({ page, role }) => {
    test.skip(['super_admin', 'admin_iglesia'].includes(role), `Rol ${role} tiene botones de gestión`)

    await gotoTenant(page, 'pastores')
    await expect(page).not.toHaveURL('/login')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
    // No management buttons visible
    await expect(page.getByRole('button', { name: /nueva iglesia|asignar iglesia/i })).not.toBeVisible({ timeout: 4_000 })
  })

})
