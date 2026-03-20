/* eslint-disable react-hooks/rules-of-hooks */
import {
  test as base,
  expect,
} from "next/experimental/testmode/playwright/msw";
import { http, HttpResponse } from "msw";
import type { Page } from "@playwright/test";
import { setAuthCookies } from "./auth.fixture";
import { defaultGraphQLHandlers } from "./graphql-handlers";
import { mockMeResponse } from "./mock-data/me";

type TestFixtures = {
  authenticatedPage: Page;
  unauthenticatedPage: Page;
};

export const test = base.extend<TestFixtures>({
  mswHandlers: defaultGraphQLHandlers,

  authenticatedPage: async ({ page, context }, use) => {
    await setAuthCookies(context);
    await use(page);
  },

  unauthenticatedPage: async ({ page }, use) => {
    await use(page);
  },
});

/**
 * Returns an MSW handler that routes `me` queries to the default mock and all
 * other GraphQL requests to the provided response factory. Use this in tests
 * that need to override a single query without re-implementing the me guard.
 */
export function withMeGuard(
  responseFactory: () => unknown,
): ReturnType<typeof http.post> {
  return http.post("*/graphql", async ({ request }) => {
    const body = (await request.json()) as { query: string };
    if (body.query.includes("me")) {
      return HttpResponse.json(mockMeResponse());
    }
    return HttpResponse.json(responseFactory() as Record<string, unknown>);
  });
}

export { expect };
