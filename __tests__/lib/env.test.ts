import { describe, expect, it, vi, beforeEach } from "vitest";

describe("env validation", () => {
  const VALID_ENV = {
    BETTER_AUTH_SECRET: "test-secret-value",
    BETTER_AUTH_URL: "http://localhost:3000",
    KEYCLOAK_CLIENT_ID: "playground",
    KEYCLOAK_URL: "http://localhost:8080",
    KEYCLOAK_REALM: "playground",
    API_SERVER_URL: "http://localhost:8081",
    NEXT_PUBLIC_API_SERVER_URL: "http://localhost:8081",
  };

  function stubValidEnv() {
    for (const [key, value] of Object.entries(VALID_ENV)) {
      vi.stubEnv(key, value);
    }
  }

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    // Ensure validation runs in tests even though vitest.config sets
    // SKIP_ENV_VALIDATION=1 globally for other tests that don't need it.
    vi.stubEnv("SKIP_ENV_VALIDATION", "");
  });

  it("parses valid environment variables", async () => {
    stubValidEnv();
    const { env } = await import("@/lib/env");
    expect(env.BETTER_AUTH_SECRET).toBe("test-secret-value");
    expect(env.API_SERVER_URL).toBe("http://localhost:8081");
  });

  it("throws when a required string env var is empty", async () => {
    stubValidEnv();
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    await expect(import("@/lib/env")).rejects.toThrow();
  });

  it("throws when a URL env var is not a valid URL", async () => {
    stubValidEnv();
    vi.stubEnv("API_SERVER_URL", "not-a-url");
    await expect(import("@/lib/env")).rejects.toThrow();
  });

  it("skips validation when SKIP_ENV_VALIDATION is set", async () => {
    vi.stubEnv("SKIP_ENV_VALIDATION", "1");
    const { env } = await import("@/lib/env");
    expect(env).toBeDefined();
  });
});
