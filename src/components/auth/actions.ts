"use server";

import { auth, keycloakIssuer } from "@/lib/auth";
import { authQuery } from "@/lib/graphql-request";
import { headers } from "next/headers";

interface CurrentUserInfo {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
}

export async function getKeycloakLogoutUrl(): Promise<string> {
  const clientId = process.env.KEYCLOAK_CLIENT_ID!;
  const redirectUri = process.env.BETTER_AUTH_URL!;
  const reqHeaders = await headers();

  // Retrieve the id_token before signing out so Keycloak can skip the
  // "Do you want to log out?" confirmation screen.
  let idToken: string | undefined;
  try {
    const tokens = await auth.api.getAccessToken({
      headers: reqHeaders,
      body: { providerId: "keycloak" },
    });
    idToken = tokens?.idToken ?? undefined;
  } catch {
    // If token retrieval fails, proceed without id_token_hint
  }

  // Revoke the Better Auth session server-side
  await auth.api.signOut({ headers: reqHeaders });

  const logoutUrl = new URL(`${keycloakIssuer}/protocol/openid-connect/logout`);
  logoutUrl.searchParams.set("client_id", clientId);
  logoutUrl.searchParams.set("post_logout_redirect_uri", redirectUri);
  if (idToken) {
    logoutUrl.searchParams.set("id_token_hint", idToken);
  }

  return logoutUrl.toString();
}

export interface TokenInfo {
  token: string;
  expiresAt: number | null;
}

/**
 * Fetch the Keycloak access token for the current session.
 * Used by the WebSocket client to authenticate subscription connections.
 */
export async function getAccessToken(): Promise<TokenInfo | null> {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session?.user?.id) {
      return null;
    }

    const tokenResponse = await auth.api.getAccessToken({
      headers: reqHeaders,
      body: { providerId: "keycloak" },
    });

    return tokenResponse?.accessToken
      ? {
          token: tokenResponse.accessToken,
          expiresAt: tokenResponse.accessTokenExpiresAt?.getTime() ?? null,
        }
      : null;
  } catch (error) {
    console.error("Failed to fetch access token:", error);
    return null;
  }
}

export async function fetchCurrentUser(): Promise<CurrentUserInfo | null> {
  try {
    const response = await authQuery({
      me: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        displayName: true,
        email: true,
      },
    });

    return response.data?.me ?? null;
  } catch {
    return null;
  }
}
