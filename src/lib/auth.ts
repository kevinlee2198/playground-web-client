import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";
import { keycloak } from "better-auth/plugins/generic-oauth";

export const keycloakIssuer = `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`;

export const auth = betterAuth({
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 7 * 24 * 60 * 60, // 7 days cache duration
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
          clientId: process.env.KEYCLOAK_CLIENT_ID as string,
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
