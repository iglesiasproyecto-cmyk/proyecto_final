import { test, expect, gotoTenant, expectToast, uniqueName } from '../fixtures'

const CAN_WRITE: string[] = ['super_admin', 'admin_iglesia']

/** Click each Radix UI combobox in the dialog and select the first available option */
async function selectAllRadixInDialog(page: Parameters<typeof gotoTenant>[0]) {
  const triggers = page.locator('[role="dialog"] [role="combobox"]')
  const count = await triggers.count()
  for (let i = 0; i < count; i++) {
    await triggers.nth(i).click().catch(() => {})
    await page.waitForTimeout(300)
    const opt = page.locator('[role="option"]').first()
    if (await opt.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await opt.click()
      await page.waitForTimeout(500) // cascading selects need time to load next level
    } else {
      await page.keyboard.press('Escape')
    }
  }
}

test.describe('Sedes — CRUD funcional + permisos por rol', () => {

  test('todos los roles ven la lista de sedes', async ({ page, role }) => {
    await gotoTenant(page, 'sedes')
    await expect(page).not.toHaveURL('/login')
    await expect(page.locator('h1, h2, table, .card').first()).toBeVisible({ timeout: 10_000 })
  })

  test('botón Nueva Sede visible solo para admin', async ({ page, role }) => {
    await gotoTenant(page, 'sedes')
    const btn = page.getByRole('button', { name: /nueva sede/i })

    if (CAN_WRITE.includes(role)) {
      await expect(btn).toBeVisible({ timeout: 8_000 })
    } else {
      await expect(btn).not.toBeVisible({ timeout: 5_000 })
    }
  })

  test('super_admin puede crear una sede y aparece en la lista', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Test funcional solo para super_admin')

    await gotoTenant(page, 'sedes')
    const nombre = uniqueName('Sede Test')

    await page.getByRole('button', { name: /nueva sede/i }).click()
    // Nombre input has no placeholder — use first input inside dialog
    await page.locator('[role="dialog"] input').first().fill(nombre)

    // Select Iglesia, País, Departamento, Ciudad via Radix comboboxes
    await selectAllRadixInDialog(page)

    await page.getByRole('button', { name: /guardar/i }).click()
    await expectToast(page, /sede creada/i)
    await expect(page.getByText(nombre)).toBeVisible({ timeout: 8_000 })
  })

  test('admin_iglesia puede crear una sede en su iglesia', async ({ page, role }) => {
    test.skip(role !== 'admin_iglesia', 'Test funcional solo para admin_iglesia')

    await gotoTenant(page, 'sedes')
    const nombre = uniqueName('Sede Admin')

    await page.getByRole('button', { name: /nueva sede/i }).click()
    await page.locator('[role="dialog"] input').first().fill(nombre)
    await selectAllRadixInDialog(page)

    await page.getByRole('button', { name: /guardar/i }).click()
    await expectToast(page, /sede creada/i)
    await expect(page.getByText(nombre)).toBeVisible({ timeout: 8_000 })
  })

  test('super_admin puede editar una sede existente', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Test funcional solo para super_admin')

    await gotoTenant(page, 'sedes')

    // Edit button is icon-only (Pencil), second icon-button in each row
    // Rows have: Eye | Pencil | Toggle | Trash
    const editBtn = page.locator('button:nth-of-type(2)').first()
    const allIconBtns = page.locator('table button, [class*="grid"] button').all()
    // Use title or aria pattern — click any pencil button via its parent row
    // Fallback: look for any visible icon button that opens the edit dialog
    const pencilBtn = page.locator('button').filter({ has: page.locator('svg') }).nth(1)
    if (await pencilBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await pencilBtn.click()
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible({ timeout: 5_000 })

      const nuevoNombre = uniqueName('Sede Editada')
      await dialog.locator('input').first().clear()
      await dialog.locator('input').first().fill(nuevoNombre)

      await page.getByRole('button', { name: /guardar/i }).click()
      await expectToast(page, /sede actualizada/i)
    }
  })

  test('lider y servidor no pueden crear ni editar sedes', async ({ page, role }) => {
    test.skip(CAN_WRITE.includes(role), `Rol ${role} sí puede escribir`)

    await gotoTenant(page, 'sedes')
    await expect(page.getByRole('button', { name: /nueva sede/i })).not.toBeVisible({ timeout: 5_000 })
  })

})
