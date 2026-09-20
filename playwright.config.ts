import { defineConfig, devices } from '@playwright/test';

import {
  AUTH_BASE_URL,
  AUTH_PORT,
  E2E_AUTH_GOOGLE_ID,
  E2E_AUTH_GOOGLE_SECRET,
  E2E_AUTH_SECRET,
  E2E_DATABASE_URL,
  EXISTING_BASE_URL,
  EXISTING_PORT,
  EXISTING_SESSION_USER,
  GUEST_BASE_URL,
  GUEST_PORT,
  GUEST_SESSION_USER,
  RECIPIENT_BASE_URL,
  RECIPIENT_PORT,
  RECIPIENT_SESSION_USER,
  SIGNUP_BASE_URL,
  SIGNUP_PORT,
  SIGNUP_SESSION_USER,
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
  // Local: fail fast (0). CI: a residual streaming-render transient can still
  // surface a one-shot postgres-js `Connection closed` when a prospective-render
  // abort races a cold server; 2 retries absorb that without masking a real,
  // reproducible failure (which fails all attempts).
  retries: process.env.CI ? 2 : 0,
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
    // One project per un-onboarded identity. They exist because the gate is
    // read from the session's own rows, so the only way to meet it is to be
    // that account — and the bypass admits one account per process.
    {
      name: 'onboarding-signup',
      testMatch: /.*\.signup\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: SIGNUP_BASE_URL },
    },
    {
      name: 'onboarding-existing',
      testMatch: /.*\.existing\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: EXISTING_BASE_URL },
    },
  ],

  // Five production servers sharing one Docker DB. authenticated → identity
  // selector unset ⇒ dev-test-viewer session; guest → BYPASS_SESSION_USER=guest
  // ⇒ no session; the two onboarding modes → their un-onboarded seeded ids;
  // recipient → the account an invite link admits, which cannot be the minting
  // one. It carries no project of its own: the invite round trip starts as the
  // viewer and reaches this server by absolute URL, because one flow spans both
  // ends and a Playwright test belongs to a single project.
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
    {
      command: `npx next start -p ${SIGNUP_PORT}`,
      url: SIGNUP_BASE_URL,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...baseServerEnv, BYPASS_SESSION_USER: SIGNUP_SESSION_USER },
    },
    {
      command: `npx next start -p ${EXISTING_PORT}`,
      url: EXISTING_BASE_URL,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...baseServerEnv, BYPASS_SESSION_USER: EXISTING_SESSION_USER },
    },
    {
      command: `npx next start -p ${RECIPIENT_PORT}`,
      url: RECIPIENT_BASE_URL,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...baseServerEnv, BYPASS_SESSION_USER: RECIPIENT_SESSION_USER },
    },
  ],
});
