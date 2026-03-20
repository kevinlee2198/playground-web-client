import { test, expect, withMeGuard } from "../fixtures/test-fixtures";
import { mockEmptyGamesResponse } from "../fixtures/mock-data/games";

test.describe("Games List Page", () => {
  test("[CRITICAL] unauthenticated: redirects to /", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en/games");
    await expect(unauthenticatedPage).toHaveURL(/\/en\/?$/);
  });

  test("[CRITICAL] authenticated: renders Games heading", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/games");
    await expect(
      authenticatedPage.getByRole("heading", { name: "Games" }),
    ).toBeVisible();
  });

  test("authenticated: Create Game button links to /games/new", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/games");
    const btn = authenticatedPage.getByRole("link", { name: "Create Game" });
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute("href", /\/games\/new/);
  });

  test("authenticated: game cards render with mock data", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/games");
    // GameCard uses getLocationText() which formats as "city, state"
    await expect(
      authenticatedPage.getByText("Test City, TS").first(),
    ).toBeVisible();
  });

  test("authenticated: empty state when no games", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(withMeGuard(mockEmptyGamesResponse));
    await authenticatedPage.goto("/en/games");
    await expect(authenticatedPage.getByText(/no.*game/i)).toBeVisible();
  });

  test("authenticated: sort dropdown is visible", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/games");
    await expect(
      authenticatedPage
        .getByRole("combobox")
        .or(authenticatedPage.getByRole("button", { name: /sort/i }))
        .first(),
    ).toBeVisible();
  });

  test("authenticated: filter sidebar visible on desktop", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/games");
    await expect(
      authenticatedPage.getByText(/sport type|filter/i).first(),
    ).toBeVisible();
  });
});
