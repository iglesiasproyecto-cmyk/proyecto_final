import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

const BASE_URL = process.env.TEST_URL ?? 'http://localhost:5173'

// WSL2: Firefox needs libasound2 which may not be installed system-wide.
// Extract the .so from the deb package into /tmp/alsa-lib and set LD_LIBRARY_PATH.
// This env var is propagated to browser child processes automatically.
const ALSA_LIB_PATH = '/tmp/alsa-lib/usr/lib/x86_64-linux-gnu'
if (!process.env.LD_LIBRARY_PATH?.includes(ALSA_LIB_PATH)) {
  process.env.LD_LIBRARY_PATH = ALSA_LIB_PATH + (process.env.LD_LIBRARY_PATH ? ':' + process.env.LD_LIBRARY_PATH : '')
}
// Also skip Playwright's host validation since libasound2 may be satisfied via LD_LIBRARY_PATH
process.env.PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = '1'

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
    // fullyParallel:false + timeout:60000 → login secuencial evita race conditions con Supabase
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      fullyParallel: false,
      use: { ...devices['Desktop Firefox'] },
      timeout: 60_000,
    },

    // 4 proyectos paralelos — cada uno usa la sesión de su rol
    // WSL2: usando Firefox porque Chromium requiere libnspr4/libnss3 no disponibles
    {
      name: 'super_admin',
      use: {
        ...devices['Desktop Firefox'],
        storageState: '.auth/super_admin.json',
      },
      dependencies: ['setup'],
      testMatch: /specs\/.+\.spec\.ts/,
    },
    {
      name: 'admin_iglesia',
      use: {
        ...devices['Desktop Firefox'],
        storageState: '.auth/admin_iglesia.json',
      },
      dependencies: ['setup'],
      testMatch: /specs\/.+\.spec\.ts/,
    },
    {
      name: 'lider',
      use: {
        ...devices['Desktop Firefox'],
        storageState: '.auth/lider.json',
      },
      dependencies: ['setup'],
      testMatch: /specs\/.+\.spec\.ts/,
    },
    {
      name: 'servidor',
      use: {
        ...devices['Desktop Firefox'],
        storageState: '.auth/servidor.json',
      },
      dependencies: ['setup'],
      testMatch: /specs\/.+\.spec\.ts/,
    },

    // Proyecto RLS: tests sin browser (API-only)
    {
      name: 'rls',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
      testMatch: /specs\/10-rls-backend\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
