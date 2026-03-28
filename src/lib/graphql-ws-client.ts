"use client";

import type { TokenInfo } from "@/components/auth/actions";
import { createClient, CloseCode, type Client } from "graphql-ws";
import { GRAPHQL_PATH } from "./graphql-config";

let client: Client | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | null = null;
let lastExpiresAt: number | null = null;

const BUFFER_MS = 30_000;

function getWsUrl(): string {
  const httpUrl = process.env.NEXT_PUBLIC_API_SERVER_URL;
  if (!httpUrl) {
    throw new Error("NEXT_PUBLIC_API_SERVER_URL is not defined");
  }
  return `${httpUrl.replace(/^http/, "ws")}${GRAPHQL_PATH}`;
}

function clearExpiryTimer(): void {
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
}

export function getGraphQLWsClient(
  fetchToken: () => Promise<TokenInfo | null>,
): Client {
  if (client) return client;

  client = createClient({
    url: getWsUrl(),
    connectionParams: async () => {
      try {
        const tokenInfo = await fetchToken();
        if (tokenInfo) {
          lastExpiresAt = tokenInfo.expiresAt;
          return { Authorization: `Bearer ${tokenInfo.token}` };
        }
        lastExpiresAt = null;
        return {};
      } catch (error) {
        console.error("[graphql-ws] Failed to fetch token:", error);
        lastExpiresAt = null;
        return {};
      }
    },
    retryAttempts: Infinity,
    retryWait: async (retries) => {
      const delay = Math.min(1000 * Math.pow(2, retries), 30000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    },
    shouldRetry: () => true,
    on: {
      error: (error) => {
        console.error("[graphql-ws] Connection error:", error);
      },
      connected: (socket) => {
        console.debug("[graphql-ws] Connected");
        clearExpiryTimer();
        if (lastExpiresAt !== null) {
          const timeUntilClose = lastExpiresAt - Date.now() - BUFFER_MS;
          if (timeUntilClose > 0) {
            expiryTimer = setTimeout(() => {
              if ((socket as WebSocket).readyState === WebSocket.OPEN) {
                (socket as WebSocket).close(CloseCode.Forbidden, "Forbidden");
              }
            }, timeUntilClose);
          }
          // else: token is nearly expired, let server close it
        }
      },
      closed: (event) => {
        console.debug("[graphql-ws] Closed:", event);
        clearExpiryTimer();
      },
    },
  });

  return client;
}

export function disposeGraphQLWsClient(): void {
  clearExpiryTimer();
  if (client) {
    client.dispose();
    client = null;
  }
}
