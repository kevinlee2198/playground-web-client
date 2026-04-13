import { EncryptJWT, base64url, calculateJwkThumbprint } from "jose";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

// Test user constants used across all tests
export const TEST_USER = {
  id: "test-user-id",
  email: "testuser@example.com",
  name: "Test User",
  username: "testuser",
  createdAt: new Date("2025-01-01").toISOString(),
  updatedAt: new Date("2025-01-01").toISOString(),
  emailVerified: true,
  image: null,
} as const;

export const TEST_SESSION = {
  id: "test-session-id",
  userId: TEST_USER.id,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  token: "test-session-token",
  ipAddress: "127.0.0.1",
  userAgent: "Playwright",
} as const;

export const TEST_PLAYER_ID = 1;

// Backend schema user ID — numeric, used in GraphQL mock responses
export const TEST_BACKEND_USER_ID = 1;

const SECRET =
  process.env.BETTER_AUTH_SECRET ||
  "test-secret-for-playwright-integ-tests-32chars!!";

const INFO = new TextEncoder().encode("BetterAuth.js Generated Encryption Key");

async function encryptJWE(
  payload: Record<string, unknown>,
  secret: string,
  salt: string,
  expiresIn: number = 3600,
): Promise<string> {
  const encryptionSecret = hkdf(
    sha256,
    new TextEncoder().encode(secret),
    new TextEncoder().encode(salt),
    INFO,
    64,
  );
  const thumbprint = await calculateJwkThumbprint(
    { kty: "oct", k: base64url.encode(encryptionSecret) },
    "sha256",
  );
  return await new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256CBC-HS512", kid: thumbprint })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .setJti(crypto.randomUUID())
    .encrypt(encryptionSecret);
}

export async function forgeSessionDataCookie(): Promise<string> {
  return encryptJWE(
    { session: TEST_SESSION, user: TEST_USER, updatedAt: Date.now(), version: "1" },
    SECRET,
    "better-auth-session",
    604800,
  );
}

export async function forgeAccountDataCookie(): Promise<string> {
  return encryptJWE(
    {
      accessToken: "mock-keycloak-access-token",
      refreshToken: "mock-keycloak-refresh-token",
      accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      refreshTokenExpiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
      providerId: "keycloak",
      accountId: TEST_USER.id,
      idToken: "mock-id-token",
    },
    SECRET,
    "better-auth-account",
    300,
  );
}

/**
 * Sign a cookie value using HMAC-SHA256, matching better-call's signCookieValue format.
 * Format: encodeURIComponent("{value}.{base64(HMAC-SHA256(value, secret))}")
 */
async function signCookieValue(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  const base64Sig = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return encodeURIComponent(`${value}.${base64Sig}`);
}

export async function setAuthCookies(
  context: import("@playwright/test").BrowserContext,
): Promise<void> {
  const [sessionData, accountData, signedSessionToken] = await Promise.all([
    forgeSessionDataCookie(),
    forgeAccountDataCookie(),
    signCookieValue(TEST_SESSION.token, SECRET),
  ]);

  const cookieDefaults = {
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax" as const,
  };

  await context.addCookies([
    { ...cookieDefaults, name: "better-auth.session_token", value: signedSessionToken },
    { ...cookieDefaults, name: "better-auth.session_data", value: sessionData },
    { ...cookieDefaults, name: "better-auth.account_data", value: accountData },
  ]);
}
