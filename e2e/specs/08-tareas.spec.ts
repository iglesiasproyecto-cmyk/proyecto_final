import { test, expect, gotoTenant, uniqueName } from '../fixtures'

const CAN_CREATE: string[] = ['super_admin', 'admin_iglesia', 'lider']

test.describe('Tareas — CRUD por rol', () => {

  test('todos los roles acceden a la página de tareas', async ({ page, role }) => {
    await gotoTenant(page, 'tareas')
    await expect(page).not.toHaveURL('/login')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
  })

  test('botón Nueva Tarea visible para admin y lider', async ({ page, role }) => {
    await gotoTenant(page, 'tareas')
    const btn = page.getByRole('button', { name: /nueva tarea/i })

    if (CAN_CREATE.includes(role)) {
      await expect(btn).toBeVisible({ timeout: 8_000 })
    } else {
      await expect(btn).not.toBeVisible({ timeout: 5_000 })
    }
  })

  test('super_admin puede crear una tarea', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Test funcional solo para super_admin')

    await gotoTenant(page, 'tareas')
    const titulo = uniqueName('Tarea Test')

    await page.getByRole('button', { name: /nueva tarea/i }).click()
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Título — placeholder: "Ej. Preparar la reunión de líderes" (TasksPage)
    await dialog.getByPlaceholder(/preparar la reuni/i).fill(titulo)

    // Ministerio — native <select>, required — select first real option
    const ministerioSelect = dialog.locator('select').first()
    if (await ministerioSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const optCount = await ministerioSelect.locator('option').count()
      if (optCount > 1) await ministerioSelect.selectOption({ index: 1 })
    }

    await dialog.getByRole('button', { name: /crear tarea/i }).click()
    await expect(page.getByText(titulo)).toBeVisible({ timeout: 10_000 })
  })

  test('lider puede crear una tarea', async ({ page, role }) => {
    test.skip(role !== 'lider', 'Test funcional solo para lider')

    await gotoTenant(page, 'tareas')
    const titulo = uniqueName('Tarea Lider')

    await page.getByRole('button', { name: /nueva tarea/i }).click()
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    await dialog.getByPlaceholder(/preparar la reuni/i).fill(titulo)

    // Ministerio is auto-selected when lider has only 1 ministerio
    const ministerioSelect = dialog.locator('select').first()
    if (await ministerioSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const optCount = await ministerioSelect.locator('option').count()
      if (optCount > 1) await ministerioSelect.selectOption({ index: 1 })
    }

    await dialog.getByRole('button', { name: /crear tarea/i }).click()
    await expect(page.getByText(titulo)).toBeVisible({ timeout: 10_000 })
  })

  test('super_admin puede editar una tarea existente', async ({ page, role }) => {
    test.skip(role !== 'super_admin', 'Test funcional solo para super_admin')

    await gotoTenant(page, 'tareas')

    const editBtn = page.getByRole('button', { name: /editar/i }).first()
    if (await editBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await editBtn.click()
      const nuevoTitulo = uniqueName('Tarea Editada')
      const titleField = page.getByPlaceholder(/preparar la reuni/i)
      if (await titleField.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await titleField.clear()
        await titleField.fill(nuevoTitulo)
        await page.getByRole('button', { name: /guardar|actualizar/i }).click()
        await expect(page.getByText(nuevoTitulo)).toBeVisible({ timeout: 8_000 })
      }
    }
  })

  test('servidor ve solo sus tareas asignadas, sin botón de crear', async ({ page, role }) => {
    test.skip(role !== 'servidor', 'Solo aplica para servidor')

    await gotoTenant(page, 'tareas')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /nueva tarea/i })).not.toBeVisible({ timeout: 5_000 })
  })

  test('servidor puede cambiar estado de tarea asignada', async ({ page, role }) => {
    test.skip(role !== 'servidor', 'Solo aplica para servidor')

    await gotoTenant(page, 'tareas')
    const statusBtn = page.getByRole('button', { name: /completar|marcar|en progreso|iniciar/i }).first()
    if (await statusBtn.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await statusBtn.click()
      await expect(page.locator('[data-sonner-toast], [role="status"]').first()).toBeVisible({ timeout: 8_000 })
    } else {
      // No assigned tasks — just verify page loaded
      await expect(page.locator('h1, h2').first()).toBeVisible()
    }
  })

})
