import { defineConfig, devices } from '@playwright/test';

import {
  AUTH_BASE_URL,
  AUTH_PORT,
  E2E_AUTH_GOOGLE_ID,
  E2E_AUTH_GOOGLE_SECRET,
  E2E_AUTH_SECRET,
  E2E_DATABASE_URL,
  GUEST_BASE_URL,
  GUEST_PORT,
  GUEST_SESSION_USER,
} from './e2e/helpers/constants';

// Shared production-server env for both modes. USE_PG_DRIVER=1 routes the app
// at the localhost Docker Postgres AND turns on the auth bypass (db/index.ts,
// lib/auth.ts); NODE_ENV=production + `next start` keeps the `'use cache'` /
// revalidateTag layer live. The stubbed OAuth creds/secret
// let the production server boot — real Google is never negotiated under the
// bypass.
const baseServerEnv = {
  NODE_ENV: 'production',
  USE_PG_DRIVER: '1',
  DATABASE_URL: E2E_DATABASE_URL,
  AUTH_SECRET: E2E_AUTH_SECRET,
  AUTH_GOOGLE_ID: E2E_AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: E2E_AUTH_GOOGLE_SECRET,
} as const;

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/helpers/**'],
  // The production bundle is built ONCE by scripts/test-e2e.sh before Playwright
  // starts — NOT in globalSetup. Playwright launches each webServer (`next
  // start`) during plugin setup, before globalSetup runs, so a build here would
  // race the servers that need it.

  // One server process per mode against a shared DB: serialize so parallel
  // workers can't interleave writes, and so each server's in-memory tag store
  // stays intact across a file.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  // The bypass is process-wide (no per-request seam), so an authenticated
  // viewer and a logged-out guest need separate server processes. Each project
  // targets its own baseURL and matches its own spec suffix; a third seeded
  // identity is a config addition here, not a redesign.
  projects: [
    {
      name: 'authenticated',
      testMatch: /.*\.auth\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: AUTH_BASE_URL },
    },
    {
      name: 'guest',
      testMatch: /.*\.guest\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: GUEST_BASE_URL },
    },
  ],

  // Two production servers sharing one Docker DB. authenticated → identity
  // selector unset ⇒ dev-test-viewer session; guest → BYPASS_SESSION_USER=guest
  // ⇒ no session.
  webServer: [
    {
      command: `npx next start -p ${AUTH_PORT}`,
      url: AUTH_BASE_URL,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...baseServerEnv },
    },
    {
      command: `npx next start -p ${GUEST_PORT}`,
      url: GUEST_BASE_URL,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...baseServerEnv, BYPASS_SESSION_USER: GUEST_SESSION_USER },
    },
  ],
});
