"use server";

import { auth, keycloakIssuer } from "@/lib/auth";
import { env } from "@/lib/env";
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

export type FetchUserResult =
  | { status: "authenticated"; user: CurrentUserInfo }
  | { status: "unauthenticated" }
  | { status: "error" };

export async function getKeycloakLogoutUrl(): Promise<string> {
  const clientId = env.KEYCLOAK_CLIENT_ID;
  const redirectUri = env.BETTER_AUTH_URL;
  const reqHeaders = await headers();

  // Retrieve the id_token before signing out so Keycloak can skip the
  // "Do you want to log out?" confirmation screen.
  let idToken: string | undefined;
  try {
    const tokens = await auth.api.getAccessToken({
      headers: reqHeaders,
      body: { providerId: "keycloak" },
    });
    idToken = tokens?.idToken;
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
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session?.user?.id) {
    return null;
  }

  try {
    const tokenResponse = await auth.api.getAccessToken({
      headers: reqHeaders,
      body: { providerId: "keycloak" },
    });

    if (!tokenResponse?.accessToken) {
      // Stale session — clear cookies (works in Server Action context)
      await auth.api.signOut({ headers: reqHeaders });
      return null;
    }

    return {
      token: tokenResponse.accessToken,
      expiresAt: tokenResponse.accessTokenExpiresAt?.getTime() ?? null,
    };
  } catch (error) {
    console.warn(
      "[getAccessToken] Token fetch failed:",
      error instanceof Error ? error.message : String(error),
    );
    // Could be stale session or Keycloak outage — don't call signOut().
    // The auth-button handles that determination.
    return null;
  }
}

export async function fetchCurrentUser(): Promise<FetchUserResult> {
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

    if (response.data?.me) {
      return { status: "authenticated", user: response.data.me };
    }

    // No data means the token was missing (stale session) or rejected
    // (UNAUTHORIZED). Either way, clear stale cookies. signOut() works
    // here because fetchCurrentUser is a Server Action.
    const reqHeaders = await headers();
    await auth.api.signOut({ headers: reqHeaders });
    return { status: "unauthenticated" };
  } catch {
    // Network error, backend 5xx, etc. — don't sign out, could be transient
    return { status: "error" };
  }
}
