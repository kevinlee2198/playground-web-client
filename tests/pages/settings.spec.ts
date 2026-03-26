import { http, HttpResponse } from "msw";
import { test, expect } from "../fixtures/test-fixtures";

test.describe("Settings Pages", () => {
  test("[CRITICAL] unauthenticated: redirects to /", async ({
    unauthenticatedPage,
    msw,
  }) => {
    // The settings layout uses fetchCurrentUser() which queries 'me' via GraphQL.
    // Override MSW to return null for 'me' so the page treats user as unauthenticated.
    msw.use(
      http.post("*/graphql", () =>
        HttpResponse.json({ data: { me: null } }),
      ),
    );
    await unauthenticatedPage.goto("/en/settings/display");
    await expect(unauthenticatedPage).toHaveURL(/\/en\/?$/);
  });

  test("[CRITICAL] /settings redirects to /settings/display", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/settings");
    await expect(authenticatedPage).toHaveURL(/\/en\/settings\/display/);
  });

  test("sidebar navigation renders all categories", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/settings/display");
    const nav = authenticatedPage.locator('nav[aria-label="Settings"]');
    await expect(nav).toBeVisible();
    await expect(nav.getByText("Display")).toBeVisible();
    await expect(nav.getByText("Games")).toBeVisible();
    await expect(nav.getByText("Notifications")).toBeVisible();
    await expect(nav.getByText("Privacy")).toBeVisible();
  });

  test("sidebar highlights active page", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/settings/display");
    const displayLink = authenticatedPage.locator(
      'nav[aria-label="Settings"] a[aria-current="page"]',
    );
    await expect(displayLink).toContainText("Display");
  });

  test("display page renders theme and language selects", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/settings/display");
    await expect(
      authenticatedPage.getByRole("heading", { name: "Display" }),
    ).toBeVisible();
    await expect(authenticatedPage.getByText("Theme")).toBeVisible();
    await expect(authenticatedPage.getByText("Language")).toBeVisible();
  });

  test("games page renders measurement units and preferred sports", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/settings/games");
    await expect(
      authenticatedPage.getByRole("heading", { name: "Games" }),
    ).toBeVisible();
    await expect(authenticatedPage.getByText("Measurement units")).toBeVisible();
    await expect(authenticatedPage.getByText("Preferred sports")).toBeVisible();
  });

  test("notifications page renders toggle and email digest", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/settings/notifications");
    await expect(
      authenticatedPage.getByRole("heading", { name: "Notifications" }),
    ).toBeVisible();
    await expect(authenticatedPage.getByText("Enable notifications")).toBeVisible();
    await expect(authenticatedPage.getByText("Email digest")).toBeVisible();
  });

  test("privacy page renders all three sections", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/settings/privacy");
    await expect(
      authenticatedPage.getByRole("heading", { name: "Privacy" }),
    ).toBeVisible();
    await expect(authenticatedPage.getByText("Profile visibility")).toBeVisible();
    await expect(authenticatedPage.getByText("Visibility controls")).toBeVisible();
    await expect(
      authenticatedPage.getByRole("heading", { name: "Blocked users" }),
    ).toBeVisible();
  });
});
