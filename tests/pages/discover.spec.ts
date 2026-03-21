import { test, expect, withMeGuard } from "../fixtures/test-fixtures";
import { mockEmptyGamesResponse } from "../fixtures/mock-data/games";

test.describe("Discover Feed", () => {
  test.describe("Public Home Page (unauthenticated)", () => {
    test("[CRITICAL] renders hero tagline heading", async ({
      unauthenticatedPage,
    }) => {
      await unauthenticatedPage.goto("/en");
      await expect(
        unauthenticatedPage.getByRole("heading", { name: "Where Friends Come to Play" }),
      ).toBeVisible();
    });

    test("renders game cards from public feed", async ({
      unauthenticatedPage,
    }) => {
      await unauthenticatedPage.goto("/en");
      await expect(
        unauthenticatedPage.getByText("Test City, TS").first(),
      ).toBeVisible();
    });

    test("shows empty state when no games", async ({
      unauthenticatedPage,
      msw,
    }) => {
      msw.use(withMeGuard(mockEmptyGamesResponse));
      await unauthenticatedPage.goto("/en");
      await expect(
        unauthenticatedPage.getByText(/no.*game/i),
      ).toBeVisible();
    });

    test("renders location indicator", async ({ unauthenticatedPage }) => {
      await unauthenticatedPage.goto("/en");
      await expect(
        unauthenticatedPage.getByText(/games everywhere|finding your location/i),
      ).toBeVisible();
    });

    test("shows location name when lat/lng/loc params provided", async ({
      unauthenticatedPage,
    }) => {
      await unauthenticatedPage.goto("/en?lat=30.27&lng=-97.74&loc=Austin%2C+TX");
      await expect(
        unauthenticatedPage.getByText("Austin, TX"),
      ).toBeVisible();
    });
  });

  test.describe("Games Page Discover Tab (authenticated)", () => {
    test("[CRITICAL] renders Discover tab", async ({
      authenticatedPage,
    }) => {
      await authenticatedPage.goto("/en/games?tab=discover");
      await expect(
        authenticatedPage.getByRole("tab", { name: /discover/i }),
      ).toBeVisible();
    });

    test("renders game cards on Discover tab", async ({
      authenticatedPage,
    }) => {
      await authenticatedPage.goto("/en/games?tab=discover");
      await expect(
        authenticatedPage.getByText("Test City, TS").first(),
      ).toBeVisible();
    });

    test("renders location indicator on Discover tab", async ({
      authenticatedPage,
    }) => {
      await authenticatedPage.goto("/en/games?tab=discover");
      await expect(
        authenticatedPage.getByText(/games everywhere|finding your location/i),
      ).toBeVisible();
    });

    test("My Games tab is also accessible", async ({
      authenticatedPage,
    }) => {
      await authenticatedPage.goto("/en/games?tab=my");
      await expect(
        authenticatedPage.getByRole("tab", { name: /my games/i }).first(),
      ).toBeVisible();
    });
  });
});
