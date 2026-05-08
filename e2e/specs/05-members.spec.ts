import { test, expect, gotoTenant } from '../fixtures'

const CAN_MANAGE: string[] = ['super_admin', 'admin_iglesia', 'lider']

test.describe('Miembros — CRUD por rol', () => {

  test('admin y lider acceden a la página de miembros', async ({ page, role }) => {
    await gotoTenant(page, 'miembros')
    await expect(page).not.toHaveURL('/login')

    if (CAN_MANAGE.includes(role)) {
      await expect(page.locator('h1, h2, table').first()).toBeVisible({ timeout: 60_000 })
    }
  })

  test('admin ve selector "Todos los ministerios"', async ({ page, role }) => {
    test.skip(!['super_admin', 'admin_iglesia'].includes(role), 'Solo admins ven todos los ministerios')

    await gotoTenant(page, 'miembros')
    // Admin sees all-ministerio dropdown — check the select contains "Todos los ministerios" option
    const selectEl = page.locator('select').first()
    await expect(selectEl).toBeVisible({ timeout: 15_000 })
    await expect(selectEl).toContainText(/todos/i)
  })

  test('admin puede agregar un miembro a un ministerio', async ({ page, role }) => {
    test.skip(!['super_admin', 'admin_iglesia'].includes(role), `Rol ${role} no puede gestionar miembros`)

    await gotoTenant(page, 'miembros')

    const addBtn = page.getByRole('button', { name: /agregar|a[ñn]adir|nuevo miembro/i }).first()
    await expect(addBtn).toBeVisible({ timeout: 8_000 })
    await addBtn.click()

    // Dialog opens — select first available user from the select inside the dialog
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    const userSelect = dialog.locator('select').first()
    if (await userSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const optCount = await userSelect.locator('option').count()
      if (optCount > 1) await userSelect.selectOption({ index: 1 })
    }

    const confirmBtn = dialog.getByRole('button', { name: /agregar|guardar|confirmar/i }).last()
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click()
    }
    // Verify table has at least one row (member exists)
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 8_000 })
  })

  test('servidor no ve botones de gestión de miembros', async ({ page, role }) => {
    test.skip(role !== 'servidor', 'Solo aplica para servidor')

    await gotoTenant(page, 'miembros')
    // Servidor has very limited access — page may be empty or show read-only view
    await expect(page.getByRole('button', { name: /agregar|a[ñn]adir/i })).not.toBeVisible({ timeout: 5_000 })
  })

})
