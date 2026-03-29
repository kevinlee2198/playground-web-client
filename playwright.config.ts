import { defineConfig, devices } from "next/experimental/testmode/playwright";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // The experimental testProxy drops connections (ECONNRESET) under heavy
  // concurrency because all workers funnel through a single Next.js dev-server
  // proxy. Capping workers avoids most flakes. Revisit once testProxy graduates
  // from experimental — unlimited workers may work fine then.
  // Ref: https://github.com/vercel/next.js/issues/82913
  workers: process.env.CI ? 1 : 4,
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
    command: "npm run dev",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: !process.env.CI,
    env: {
      PLAYWRIGHT: "1",
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
