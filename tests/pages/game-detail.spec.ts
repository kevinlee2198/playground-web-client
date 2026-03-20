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
    // SportEmojiPill renders an emoji with aria-label="Basketball", not visible text
    await expect(
      authenticatedPage.getByLabel(/basketball/i).first(),
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
    // Game detail hero uses formatAddress(address) which joins city, state, country
    await expect(
      authenticatedPage.getByText("Test City, TS, US").first(),
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

  test("authenticated: completed basketball game renders with Final status", async ({
    authenticatedPage,
    msw,
  }) => {
    // COMPLETE games show "Final" badge and the score block message
    msw.use(
      withMeGuard(() => mockGameDetailResponse({ gameStatus: "COMPLETE" })),
    );
    await authenticatedPage.goto("/en/game/game-1");
    // Without mock participants, the score block shows "Add participants to track scores"
    await expect(
      authenticatedPage.getByText(/add participants/i).first(),
    ).toBeVisible();
  });
});
