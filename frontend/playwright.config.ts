import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against the full Docker stack (Nginx on :80 by default).
 * Bring it up first:  docker compose up -d --build
 * Then:               npm run test:e2e
 *
 * Override the target with E2E_BASE_URL (e.g. http://localhost:3000 to hit the
 * Next.js dev server directly).
 */
const baseURL = process.env.E2E_BASE_URL || "http://localhost";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
