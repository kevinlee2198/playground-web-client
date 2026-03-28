/* eslint-disable react-hooks/rules-of-hooks */
import {
  test as base,
  expect,
} from "next/experimental/testmode/playwright/msw";
import { http, HttpResponse } from "msw";
import type { Page } from "@playwright/test";
import { setAuthCookies } from "./auth.fixture";
import {
  defaultGraphQLHandlers,
  extractOperationField,
} from "./graphql-handlers";
import { mockMeResponse } from "./mock-data/me";

type TestFixtures = {
  authenticatedPage: Page;
  unauthenticatedPage: Page;
};

export const test = base.extend<TestFixtures>({
  // Override the mswHandlers option fixture with our default GraphQL handlers.
  // Must use the [value, {option: true}] tuple format for Playwright option fixtures.
  // @ts-expect-error — TS type is RequestHandler[] but runtime accepts the tuple
  mswHandlers: [defaultGraphQLHandlers, { option: true }],

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
    if (/\bme\s*\{/.test(body.query)) {
      return HttpResponse.json(mockMeResponse());
    }
    return HttpResponse.json(responseFactory() as Record<string, unknown>);
  });
}

/**
 * Returns an MSW handler that routes `me` queries to the default mock and
 * dispatches other GraphQL requests by their top-level field name using the
 * provided response map. Unmatched fields fall through to `{ data: {} }`.
 *
 * Use this when a test needs to override multiple queries/mutations while
 * preserving the `me` guard.
 */
export function withMeGuardMap(
  responseMap: Record<string, unknown>,
): ReturnType<typeof http.post> {
  return http.post("*/graphql", async ({ request }) => {
    const body = (await request.json()) as { query: string };
    const field = extractOperationField(body.query);

    if (field === "me") {
      return HttpResponse.json(mockMeResponse());
    }
    if (field && field in responseMap) {
      return HttpResponse.json(responseMap[field] as Record<string, unknown>);
    }
    return HttpResponse.json({ data: {} });
  });
}

export { expect };
