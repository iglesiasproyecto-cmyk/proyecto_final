import { test, expect, gotoTenant, uniqueName } from '../fixtures'

const CAN_MANAGE: string[] = ['super_admin', 'admin_iglesia']

test.describe('Ministerios — CRUD por rol', () => {

  test('todos los roles ven la lista de ministerios', async ({ page, role }) => {
    await gotoTenant(page, 'ministerios')
    await expect(page).not.toHaveURL('/login')
    await expect(page.locator('h1, h2, .grid, .space-y-4').first()).toBeVisible({ timeout: 10_000 })
  })

  test('admin puede crear un ministerio', async ({ page, role }) => {
    test.skip(!CAN_MANAGE.includes(role), `Rol ${role} no puede crear ministerios`)

    await gotoTenant(page, 'ministerios')
    const nombre = uniqueName('Min Test')

    // Button text: "+ Nuevo" — opens create dialog
    const createBtn = page.getByRole('button', { name: /^nuevo$/i })
    await expect(createBtn).toBeVisible({ timeout: 15_000 })
    await createBtn.click()

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Fill nombre (placeholder: "Ej. Alabanza y Adoración")
    await dialog.getByPlaceholder(/alabanza/i).fill(nombre)

    // Select Sede (Radix UI combobox — required for submit)
    const sedeCombo = dialog.locator('[role="combobox"]').first()
    if (await sedeCombo.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await sedeCombo.click()
      await page.waitForTimeout(300)
      const opt = page.locator('[role="option"]').first()
      if (await opt.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await opt.click()
        await page.waitForTimeout(300)
      }
    }

    await dialog.getByRole('button', { name: /crear ministerio/i }).click()
    await expect(page.getByText(nombre)).toBeVisible({ timeout: 10_000 })
  })

  test('admin puede entrar al detalle y gestionar servidores', async ({ page, role }) => {
    test.skip(!['super_admin', 'admin_iglesia', 'lider'].includes(role), `Rol ${role} no puede gestionar`)

    await gotoTenant(page, 'ministerios')

    // Click the first ministerio card/row
    const firstCard = page.locator('[class*="card"], article, .cursor-pointer').first()
    await expect(firstCard).toBeVisible({ timeout: 8_000 })
    await firstCard.click()

    // Should show detail with member management
    await expect(page.locator('h2, h3, [class*="title"]').first()).toBeVisible({ timeout: 8_000 })
  })

  test('lider y servidor no ven botón de crear ministerio', async ({ page, role }) => {
    test.skip(CAN_MANAGE.includes(role), `Rol ${role} sí puede crear ministerios`)

    await gotoTenant(page, 'ministerios')
    await expect(page.getByRole('button', { name: /^nuevo$/i })).not.toBeVisible({ timeout: 5_000 })
  })

})
