import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

const BASE_URL = process.env.TEST_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Setup: corre primero, loguea los 4 roles y guarda sessions
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // 4 proyectos paralelos — cada uno usa la sesión de su rol
    {
      name: 'super_admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/super_admin.json',
      },
      dependencies: ['setup'],
      testMatch: /specs\/.+\.spec\.ts/,
    },
    {
      name: 'admin_iglesia',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/admin_iglesia.json',
      },
      dependencies: ['setup'],
      testMatch: /specs\/.+\.spec\.ts/,
    },
    {
      name: 'lider',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/lider.json',
      },
      dependencies: ['setup'],
      testMatch: /specs\/.+\.spec\.ts/,
    },
    {
      name: 'servidor',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/servidor.json',
      },
      dependencies: ['setup'],
      testMatch: /specs\/.+\.spec\.ts/,
    },

    // Proyecto RLS: tests sin browser (API-only), corre con sesiones ya creadas
    {
      name: 'rls',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testMatch: /specs\/10-rls-backend\.spec\.ts/,
    },
  ],
})
