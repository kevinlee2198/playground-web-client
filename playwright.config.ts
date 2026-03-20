import { defineConfig, devices } from "next/experimental/testmode/playwright";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "PLAYWRIGHT=1 npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      BETTER_AUTH_SECRET: "test-secret-for-playwright-integ-tests-32chars!!",
      BETTER_AUTH_URL: "http://localhost:3000",
      KEYCLOAK_CLIENT_ID: "test-client",
      KEYCLOAK_URL: "http://localhost:8081",
      KEYCLOAK_REALM: "test",
      API_SERVER_URL: "http://localhost:8080",
      NEXT_PUBLIC_API_SERVER_URL: "http://localhost:8080",
    },
  },
});
