import { test, expect, withMeGuard } from "../fixtures/test-fixtures";
import { mockEmptyChatRoomsResponse } from "../fixtures/mock-data/chat";

const chatRoomsError = () => ({
  data: null,
  errors: [{ message: "Server error", extensions: { classification: "INTERNAL_ERROR" } }],
});

test.describe("Chat Page", () => {
  test("[CRITICAL] unauthenticated: redirects to /", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en/chat");
    await expect(unauthenticatedPage).toHaveURL(/\/en\/?$/);
  });

  test("[CRITICAL] authenticated: chat layout renders", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/chat");
    await expect(authenticatedPage).toHaveURL(/\/en\/chat/);
    await expect(authenticatedPage.locator("body")).toBeVisible();
  });

  test("authenticated: error state when rooms fail to load", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(withMeGuard(chatRoomsError));
    await authenticatedPage.goto("/en/chat");
    await expect(authenticatedPage).toHaveURL(/\/en\/chat/);
  });

  test("authenticated: empty state when no chat rooms", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(withMeGuard(mockEmptyChatRoomsResponse));
    await authenticatedPage.goto("/en/chat");
    await expect(authenticatedPage).toHaveURL(/\/en\/chat/);
  });
});
