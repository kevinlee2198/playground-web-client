import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";

export const auth = betterAuth({
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
        {
          providerId: "keycloak",
          clientId: process.env.KEYCLOAK_CLIENT_ID as string,
          clientSecret: process.env.KEYCLOAK_CLIENT_SECRET as string,
          discoveryUrl: process.env.KEYCLOAK_DISCOVERY_URL as string,
          // "https://auth.example.com/.well-known/openid-configuration",
        },
      ],
    }),
    nextCookies(), // make sure this is the last plugin in the array
  ],
});
