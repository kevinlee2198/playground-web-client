import { test, expect, withMeGuard } from "../fixtures/test-fixtures";
import { mockEmptyFeedResponse } from "../fixtures/mock-data/feed";

test.describe("Home / Feed Page", () => {
  test("[CRITICAL] unauthenticated: renders without error", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en");
    await expect(unauthenticatedPage.locator("body")).toBeVisible();
  });

  test("[CRITICAL] authenticated: renders feed title", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en");
    await expect(
      authenticatedPage.getByRole("heading", { name: "Activity Feed" }),
    ).toBeVisible();
  });

  test("authenticated: Create Game button links to /game", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en");
    const btn = authenticatedPage
      .locator("main")
      .getByRole("link", { name: "Create Game" });
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute("href", /\/game$/);
  });

  test("authenticated: feed displays game cards", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en");
    await expect(
      authenticatedPage.getByText("Test City, TS").first(),
    ).toBeVisible();
  });

  test("authenticated: empty feed shows empty state", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(withMeGuard(mockEmptyFeedResponse));
    await authenticatedPage.goto("/en");
    await expect(
      authenticatedPage.getByRole("link", { name: /create a game/i }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("link", { name: /find people/i }),
    ).toBeVisible();
  });

  test("authenticated: feed game card links to game detail", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en");
    const gameLink = authenticatedPage
      .locator("main a[href*='/game/']")
      .first();
    await expect(gameLink).toBeVisible();
    await expect(gameLink).toHaveAttribute("href", /\/game\//);
  });
});
