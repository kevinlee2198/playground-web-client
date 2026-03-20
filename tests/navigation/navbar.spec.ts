import { test, expect } from "../fixtures/test-fixtures";

test.describe("Navbar", () => {
  test("[CRITICAL] unauthenticated: logo visible and links home", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en");
    const logo = unauthenticatedPage.getByRole("link", {
      name: /playground/i,
    });
    await expect(logo).toBeVisible();
  });

  test("[CRITICAL] unauthenticated: Sign In button visible", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en");
    await expect(
      unauthenticatedPage.getByRole("button", { name: /sign in/i }),
    ).toBeVisible();
  });

  test("[CRITICAL] unauthenticated: Create Game NOT visible", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en");
    await expect(
      unauthenticatedPage.getByRole("link", { name: "Create Game" }),
    ).not.toBeVisible();
  });

  test("[CRITICAL] authenticated: user avatar is visible", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en");
    await expect(
      authenticatedPage.locator('[data-slot="dropdown-menu-trigger"]'),
    ).toBeVisible();
  });

  test("authenticated: Create Game button visible on desktop", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en");
    await expect(
      authenticatedPage
        .locator("nav")
        .getByRole("link", { name: "Create Game" }),
    ).toBeVisible();
  });

  test("desktop: search bar is visible", async ({ unauthenticatedPage }) => {
    await unauthenticatedPage.goto("/en");
    await expect(
      unauthenticatedPage
        .getByRole("searchbox")
        .or(unauthenticatedPage.getByPlaceholder(/search/i))
        .first(),
    ).toBeVisible();
  });

  test("authenticated: avatar menu contains Profile, Settings, Sign Out", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en");
    const avatarButton = authenticatedPage.locator(
      '[data-slot="dropdown-menu-trigger"]',
    );
    await avatarButton.click();
    await expect(
      authenticatedPage.locator('[data-slot="dropdown-menu-content"]'),
    ).toBeVisible();
    await expect(
      authenticatedPage.locator('[data-slot="dropdown-menu-item"]', { hasText: /profile/i }),
    ).toBeVisible();
    await expect(
      authenticatedPage.locator('[data-slot="dropdown-menu-item"]', { hasText: /settings/i }),
    ).toBeVisible();
    await expect(
      authenticatedPage.locator('[data-slot="dropdown-menu-item"]', { hasText: /sign out/i }),
    ).toBeVisible();
  });
});
