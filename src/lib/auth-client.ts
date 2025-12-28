import { genericOAuthClient } from "better-auth/client/plugins";
import { nextCookies } from "better-auth/next-js";
import { createAuthClient } from "better-auth/react";

export const { signIn, signUp, useSession } = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
  baseURL: process.env.BETTER_AUTH_URL,
  plugins: [
    genericOAuthClient(),
    nextCookies(), // make sure this is the last plugin in the array
  ],
});
