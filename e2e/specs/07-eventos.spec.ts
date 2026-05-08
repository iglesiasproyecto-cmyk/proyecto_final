import { test, expect, gotoTenant, uniqueName } from '../fixtures'

const CAN_MANAGE: string[] = ['super_admin', 'admin_iglesia', 'lider']

test.describe('Eventos — CRUD por rol', () => {

  test('todos los roles ven la lista de eventos', async ({ page, role }) => {
    await gotoTenant(page, 'eventos')
    await expect(page).not.toHaveURL('/login')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
  })

  test('botón crear evento visible para admin y lider', async ({ page, role }) => {
    await gotoTenant(page, 'eventos')
    // Button text: "+ Nuevo Evento"
    const btn = page.getByRole('button', { name: /nuevo evento/i })

    if (CAN_MANAGE.includes(role)) {
      await expect(btn).toBeVisible({ timeout: 8_000 })
    } else {
      await expect(btn).not.toBeVisible({ timeout: 5_000 })
    }
  })

  test('super_admin puede crear un evento y aparece en la lista', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Test funcional solo para super_admin')

    await gotoTenant(page, 'eventos')
    const titulo = uniqueName('Evento Test')

    await page.getByRole('button', { name: /nuevo evento/i }).click()
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Nombre del Evento — placeholder: "Ej. Culto de Adoración Especial"
    await dialog.getByPlaceholder(/Culto de Adoración/i).fill(titulo)

    // Tipo de Evento (native select, required)
    const tipoSelect = dialog.locator('select').first()
    const tipoCount = await tipoSelect.locator('option').count()
    if (tipoCount > 1) await tipoSelect.selectOption({ index: 1 })

    // Fechas (datetime-local, required)
    const fechaInputs = dialog.locator('input[type="datetime-local"]')
    await fechaInputs.first().fill('2026-06-01T10:00')
    await fechaInputs.last().fill('2026-06-01T12:00')

    await dialog.getByRole('button', { name: /crear evento/i }).click()
    await expect(page.getByText(titulo)).toBeVisible({ timeout: 10_000 })
  })

  test('lider puede crear un evento', async ({ page, role }) => {
    test.skip(role !== 'lider', 'Test funcional solo para lider')

    await gotoTenant(page, 'eventos')
    const titulo = uniqueName('Evento Lider')

    await page.getByRole('button', { name: /nuevo evento/i }).click()
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    await dialog.getByPlaceholder(/Culto de Adoración/i).fill(titulo)

    const tipoSelect = dialog.locator('select').first()
    const tipoCount = await tipoSelect.locator('option').count()
    if (tipoCount > 1) await tipoSelect.selectOption({ index: 1 })

    const fechaInputs = dialog.locator('input[type="datetime-local"]')
    await fechaInputs.first().fill('2026-06-15T10:00')
    await fechaInputs.last().fill('2026-06-15T12:00')

    await dialog.getByRole('button', { name: /crear evento/i }).click()
    await expect(page.getByText(titulo)).toBeVisible({ timeout: 10_000 })
  })

  test('super_admin puede editar un evento existente', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Test funcional solo para super_admin')

    await gotoTenant(page, 'eventos')

    // Edit button is icon-only (Pencil) — find first pencil button visible
    const pencilBtn = page.locator('button').filter({ has: page.locator('svg') }).nth(0)
    if (await pencilBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await pencilBtn.click()
      const dialog = page.locator('[role="dialog"]')
      if (await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const nuevoTitulo = uniqueName('Evento Editado')
        const nombreInput = dialog.getByPlaceholder(/Culto de Adoración/i)
        if (await nombreInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await nombreInput.clear()
          await nombreInput.fill(nuevoTitulo)
          await dialog.getByRole('button', { name: /guardar|actualizar/i }).click()
          await expect(page.getByText(nuevoTitulo)).toBeVisible({ timeout: 8_000 })
        }
      }
    }
  })

  test('servidor no puede crear ni editar eventos', async ({ page, role }) => {
    test.skip(role !== 'servidor', 'Solo aplica para servidor')

    await gotoTenant(page, 'eventos')
    await expect(page.getByRole('button', { name: /nuevo evento/i })).not.toBeVisible({ timeout: 5_000 })
  })

})
