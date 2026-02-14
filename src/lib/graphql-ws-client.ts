"use client";

import { createClient, type Client } from "graphql-ws";
import { GRAPHQL_PATH } from "./graphql-config";

let client: Client | null = null;

function getWsUrl(): string {
  const httpUrl = process.env.NEXT_PUBLIC_API_SERVER_URL;
  if (!httpUrl) {
    throw new Error("NEXT_PUBLIC_API_SERVER_URL is not defined");
  }
  return `${httpUrl.replace(/^http/, "ws")}${GRAPHQL_PATH}`;
}

export function getGraphQLWsClient(fetchToken: () => Promise<string>): Client {
  if (client) return client;

  client = createClient({
    url: getWsUrl(),
    connectionParams: async () => {
      const token = await fetchToken();
      return { Authorization: `Bearer ${token}` };
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
      connected: () => {
        console.debug("[graphql-ws] Connected");
      },
      closed: (event) => {
        console.debug("[graphql-ws] Closed:", event);
      },
    },
  });

  return client;
}

export function disposeGraphQLWsClient(): void {
  if (client) {
    client.dispose();
    client = null;
  }
}
