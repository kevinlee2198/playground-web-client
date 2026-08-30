import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    exclude: ["node_modules/**", "tests/**"],
    env: {
      SKIP_ENV_VALIDATION: "1",
      // Pinned so date/timezone-sensitive derivations (e.g. chat-thread-utils)
      // are deterministic in CI regardless of the host's local timezone.
      TZ: "America/New_York",
    },
  },
});
