import { test, expect, gotoTenant, uniqueName } from '../fixtures'

const CAN_MANAGE: string[] = ['super_admin', 'admin_iglesia', 'lider']

test.describe('Aula Virtual — CRUD por rol', () => {

  test('todos los roles acceden al aula', async ({ page, role }) => {
    await gotoTenant(page, 'aula')
    await expect(page).not.toHaveURL('/login')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
  })

  test('botón Crear Curso visible para admin y lider', async ({ page, role }) => {
    await gotoTenant(page, 'aula')
    // Button text: "Crear Nuevo Curso"
    const btn = page.getByRole('button', { name: /crear nuevo curso/i })

    if (CAN_MANAGE.includes(role)) {
      await expect(btn).toBeVisible({ timeout: 8_000 })
    } else {
      await expect(btn).not.toBeVisible({ timeout: 5_000 })
    }
  })

  test('super_admin puede crear un curso', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Test funcional solo para super_admin')

    await gotoTenant(page, 'aula')
    const titulo = uniqueName('Curso Test')

    await page.getByRole('button', { name: /crear nuevo curso/i }).click()
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // FormLabel (react-hook-form) associates label "Nombre del Curso" with the input
    const nombreInput = dialog.getByLabel('Nombre del Curso')
    if (await nombreInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nombreInput.fill(titulo)
    } else {
      // Fallback: use placeholder
      await dialog.getByPlaceholder(/Liderazgo Cristiano/i).fill(titulo)
    }

    await dialog.getByRole('button', { name: /crear|guardar/i }).last().click()
    await expect(page.getByText(titulo)).toBeVisible({ timeout: 10_000 })
  })

  test('lider puede crear un curso', async ({ page, role }) => {
    test.skip(role !== 'lider', 'Test funcional solo para lider')

    await gotoTenant(page, 'aula')
    const titulo = uniqueName('Curso Lider')

    await page.getByRole('button', { name: /crear nuevo curso/i }).click()
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    const nombreInput = dialog.getByLabel('Nombre del Curso')
    if (await nombreInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nombreInput.fill(titulo)
    } else {
      await dialog.getByPlaceholder(/Liderazgo Cristiano/i).fill(titulo)
    }

    await dialog.getByRole('button', { name: /crear|guardar/i }).last().click()
    await expect(page.getByText(titulo)).toBeVisible({ timeout: 10_000 })
  })

  test('super_admin puede entrar a un curso y ver su detalle', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Test funcional solo para super_admin')

    await gotoTenant(page, 'aula')

    // Click first course card
    const firstCourse = page.locator('[class*="card"], article, .cursor-pointer').first()
    if (await firstCourse.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstCourse.click()
      await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 8_000 })
    }
  })

  test('servidor no ve botón de crear curso', async ({ page, role }) => {
    test.skip(role !== 'servidor', 'Solo aplica para servidor')

    await gotoTenant(page, 'aula')
    await expect(page).not.toHaveURL('/login')
    await expect(page.getByRole('button', { name: /crear nuevo curso/i })).not.toBeVisible({ timeout: 5_000 })
  })

})
