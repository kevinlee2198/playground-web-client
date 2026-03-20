/* eslint-disable react-hooks/rules-of-hooks */
import {
  test as base,
  expect,
} from "next/experimental/testmode/playwright/msw";
import type { Page } from "@playwright/test";
import { setAuthCookies } from "./auth.fixture";
import { defaultGraphQLHandlers } from "./graphql-handlers";

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

export { expect };
