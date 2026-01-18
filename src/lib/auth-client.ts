import { genericOAuthClient } from "better-auth/client/plugins";
import { nextCookies } from "better-auth/next-js";
import { createAuthClient } from "better-auth/react";

export const { signIn, signUp, signOut, useSession } = createAuthClient({
  plugins: [
    genericOAuthClient(),
    nextCookies(), // make sure this is the last plugin in the array
  ],
});
