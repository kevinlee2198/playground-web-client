import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";
import { keycloak } from "better-auth/plugins/generic-oauth";
import { env } from "./env";

export const keycloakIssuer = `${env.KEYCLOAK_URL}/realms/${env.KEYCLOAK_REALM}`;

export const auth = betterAuth({
  trustedOrigins: [env.BETTER_AUTH_URL],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes — the Better Auth default
      strategy: "jwe", // can be "jwt" or "compact"
      refreshCache: true, // Enable stateless refresh
    },
  },
  account: {
    storeStateStrategy: "cookie",
    storeAccountCookie: true, // Store account data after OAuth flow in a cookie (useful for database-less flows)
  },
  plugins: [
    genericOAuth({
      config: [
        keycloak({
          clientId: env.KEYCLOAK_CLIENT_ID,
          clientSecret: "", // Empty for public clients
          issuer: keycloakIssuer,
          pkce: true,
          scopes: ["openid", "profile", "email"],
        }),
      ],
    }),
    nextCookies(), // make sure this is the last plugin in the array
  ],
});
