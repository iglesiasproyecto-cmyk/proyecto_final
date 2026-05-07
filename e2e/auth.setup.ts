import { test as setup, expect } from '@playwright/test'

const BASE_URL = process.env.TEST_URL ?? 'http://localhost:5173'

interface RoleCredentials {
  role: string
  email: string
  password: string
  authFile: string
  /** URL pattern expected after post-login redirect */
  expectedUrlPattern: RegExp
}

const roles: RoleCredentials[] = [
  {
    role: 'super_admin',
    email: process.env.TEST_SUPER_ADMIN_EMAIL!,
    password: process.env.TEST_SUPER_ADMIN_PASSWORD!,
    authFile: '.auth/super_admin.json',
    expectedUrlPattern: /\/app\/global/,
  },
  {
    role: 'admin_iglesia',
    email: process.env.TEST_ADMIN_IGLESIA_EMAIL!,
    password: process.env.TEST_ADMIN_IGLESIA_PASSWORD!,
    authFile: '.auth/admin_iglesia.json',
    expectedUrlPattern: /\/app\/\d+/,
  },
  {
    role: 'lider',
    email: process.env.TEST_LIDER_EMAIL!,
    password: process.env.TEST_LIDER_PASSWORD!,
    authFile: '.auth/lider.json',
    expectedUrlPattern: /\/app\/\d+/,
  },
  {
    role: 'servidor',
    email: process.env.TEST_SERVIDOR_EMAIL!,
    password: process.env.TEST_SERVIDOR_PASSWORD!,
    authFile: '.auth/servidor.json',
    expectedUrlPattern: /\/app\/\d+/,
  },
]

for (const creds of roles) {
  setup(`authenticate as ${creds.role}`, async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)

    // Fill login form
    await page.getByPlaceholder('name@example.com').fill(creds.email)
    await page.getByPlaceholder('••••••••').fill(creds.password)
    await page.getByRole('button', { name: /acceder al sistema/i }).click()

    // Wait for post-login redirect (goes through /auth/callback → /app/...)
    await page.waitForURL(creds.expectedUrlPattern, { timeout: 15_000 })

    // Save session (cookies + localStorage with Supabase token)
    await page.context().storageState({ path: creds.authFile })

    console.log(`✓ Session saved for ${creds.role} → ${creds.authFile}`)
  })
}
