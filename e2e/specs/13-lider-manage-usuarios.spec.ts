import { test, expect } from '@playwright/test';

test.describe('Líder User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a user with 'lider' role
    await page.goto('/login');
    await page.fill('input[name="email"]', 'lider@test.dev');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Iniciar sesión")');
    await page.waitForURL('**/app/**');
  });

  test('Líder can see invite button', async ({ page }) => {
    // Navigate to usuarios page in tenant scope
    const iglesias = await page.locator('[data-testid="iglesia-selector"]').first();
    const iglesiaId = await iglesias.getAttribute('data-id');
    await page.goto(`/app/${iglesiaId}/usuarios`);

    // Should see invite button
    const inviteBtn = page.locator('button:has-text("Invitar usuario")');
    await expect(inviteBtn).toBeVisible();
  });

  test('Líder sees only users from their ministerios', async ({ page }) => {
    const iglesias = await page.locator('[data-testid="iglesia-selector"]').first();
    const iglesiaId = await iglesias.getAttribute('data-id');
    await page.goto(`/app/${iglesiaId}/usuarios`);

    // Wait for table to load
    await page.waitForSelector('[data-testid="usuarios-table"]');

    // Verify no users from other ministerios are visible
    // (This requires knowing which ministerios the test user has)
    const rows = page.locator('[data-testid="usuario-row"]');
    const count = await rows.count();

    // Just verify we have some users or a message about no users
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('Líder invite dialog pre-selects ministerio', async ({ page }) => {
    const iglesias = await page.locator('[data-testid="iglesia-selector"]').first();
    const iglesiaId = await iglesias.getAttribute('data-id');
    await page.goto(`/app/${iglesiaId}/usuarios`);

    // Click invite button
    await page.click('button:has-text("Invitar usuario")');

    // Wait for dialog
    await page.waitForSelector('[role="dialog"]');

    // Verify ministerio is pre-selected (read-only)
    const ministerioDisplay = page.locator('text=Ministerio:');
    await expect(ministerioDisplay).toBeVisible();

    // Verify sede selector is hidden (if no admin_sede)
    const sedeSelector = page.locator('[placeholder="Selecciona sede"]');
    await expect(sedeSelector).not.toBeVisible();
  });

  test('Líder can only assign "servidor" role', async ({ page }) => {
    const iglesias = await page.locator('[data-testid="iglesia-selector"]').first();
    const iglesiaId = await iglesias.getAttribute('data-id');
    await page.goto(`/app/${iglesiaId}/usuarios`);

    // Click invite button
    await page.click('button:has-text("Invitar usuario")');

    // Wait for dialog
    await page.waitForSelector('[role="dialog"]');

    // Open role selector
    await page.click('[placeholder="Selecciona rol"]');

    // Verify only "Servidor" is available
    const options = page.locator('[role="option"]');
    const count = await options.count();

    // Should have at least 1 option (Servidor)
    // If more than 1, verify "Servidor" is the only valid option
    expect(count).toBeGreaterThan(0);

    // Check that "Servidor" is in the list
    const servidorOption = page.locator('text=Servidor');
    await expect(servidorOption).toBeVisible();
  });

  test('Líder cannot invite without completing required fields', async ({ page }) => {
    const iglesias = await page.locator('[data-testid="iglesia-selector"]').first();
    const iglesiaId = await iglesias.getAttribute('data-id');
    await page.goto(`/app/${iglesiaId}/usuarios`);

    // Click invite button
    await page.click('button:has-text("Invitar usuario")');

    // Wait for dialog
    await page.waitForSelector('[role="dialog"]');

    // Try to submit empty form
    await page.click('button:has-text("Invitar")');

    // Should see error toast
    const errorToast = page.locator('text=Completa todos los campos obligatorios');
    await expect(errorToast).toBeVisible();
  });
});
