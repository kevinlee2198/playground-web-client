// tests/pages/game-detail.spec.ts
import { test, expect, withMeGuard } from "../fixtures/test-fixtures";
import {
  mockGameNotFoundResponse,
  mockGameDetailResponse,
} from "../fixtures/mock-data/games";

test.describe("Game Detail Page", () => {
  test("[CRITICAL] unauthenticated: redirects to /", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en/game/game-1");
    await expect(unauthenticatedPage).toHaveURL(/\/en\/?$/);
  });

  test("[CRITICAL] authenticated: renders game hero", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/game/game-1");
    await expect(
      authenticatedPage.getByText(/basketball/i).first(),
    ).toBeVisible();
  });

  test("[CRITICAL] authenticated: game not found shows error", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(withMeGuard(mockGameNotFoundResponse));
    await authenticatedPage.goto("/en/game/nonexistent");
    await expect(
      authenticatedPage.getByText(/game not found/i),
    ).toBeVisible();
  });

  test("authenticated: game location is displayed", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/game/game-1");
    await expect(
      authenticatedPage.getByText("Test Court").first(),
    ).toBeVisible();
  });

  test("authenticated: participants section renders", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/game/game-1");
    await expect(
      authenticatedPage.getByText(/participant/i).first(),
    ).toBeVisible();
  });

  test("authenticated: basketball game shows box score section", async ({
    authenticatedPage,
    msw,
  }) => {
    // Box scores only render for non-SCHEDULED games
    msw.use(
      withMeGuard(() => mockGameDetailResponse({ gameStatus: "COMPLETE" })),
    );
    await authenticatedPage.goto("/en/game/game-1");
    await expect(
      authenticatedPage.getByText(/box score|stats/i).first(),
    ).toBeVisible();
  });
});
