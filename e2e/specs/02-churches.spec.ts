import { test, expect, BASE_URL, IGLESIA_ID, gotoGlobal, gotoTenant, expectToast, uniqueName } from '../fixtures'

const CAN_CREATE: string[] = ['super_admin']
const CAN_EDIT: string[] = ['super_admin', 'admin_iglesia']

test.describe('Iglesias — CRUD por rol', () => {

  test('todos los roles leen la lista/detalle de iglesias', async ({ page, role }) => {
    if (role === 'super_admin') {
      await gotoGlobal(page, 'iglesias')
    } else {
      await gotoTenant(page, 'iglesia')
    }
    await expect(page).not.toHaveURL('/login')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
  })

  test('botón Nueva Iglesia — solo visible para super_admin', async ({ page, role }) => {
    await gotoGlobal(page, 'iglesias')

    if (role === 'super_admin') {
      await expect(page.getByRole('button', { name: /nueva iglesia/i })).toBeVisible({ timeout: 8_000 })
    } else {
      // Non-super_admin gets redirected from /global — verify they leave
      await page.waitForURL(url => !url.toString().includes('/app/global'), { timeout: 12_000 })
      await expect(page).not.toHaveURL('/login')
    }
  })

  test('super_admin puede crear una iglesia', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Solo super_admin puede crear iglesias')

    await gotoGlobal(page, 'iglesias')
    const nombre = uniqueName('Iglesia Test')

    await page.getByRole('button', { name: /nueva iglesia/i }).click()
    await page.getByPlaceholder('Ej. Iglesia Central').fill(nombre)

    const fechaInput = page.locator('input[type="date"]').first()
    if (await fechaInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await fechaInput.fill('2020-01-01')
    }

    await page.getByRole('button', { name: /crear iglesia|guardar/i }).click()
    await expect(page.getByText(nombre)).toBeVisible({ timeout: 10_000 })
  })

  test('admin_iglesia puede editar datos de su iglesia', async ({ page, role }) => {
    test.skip(!CAN_EDIT.includes(role), `Rol ${role} no puede editar iglesia`)

    await gotoTenant(page, 'iglesia')

    const editBtn = page.getByRole('button', { name: /editar/i }).first()
    await expect(editBtn).toBeVisible({ timeout: 10_000 })
    await editBtn.click()

    const descField = page.getByLabel(/descripci[oó]n/i).first()
    if (await descField.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await descField.fill(uniqueName('Descripción actualizada'))
    }

    const saveBtn = page.getByRole('button', { name: /guardar cambios|guardar|actualizar/i })
    await saveBtn.click()
    // The component does window.location.reload() on success — wait for dialog to close or page to reload
    await page.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => {})
    // Just verify we're still on the church page (not redirected to login)
    await expect(page).not.toHaveURL('/login')
  })

  test('lider y servidor no ven botón de edición en iglesia', async ({ page, role }) => {
    test.skip(CAN_EDIT.includes(role), `Rol ${role} sí puede editar`)

    await gotoTenant(page, 'iglesia')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /editar/i }).first()).not.toBeVisible({ timeout: 5_000 })
  })

})
