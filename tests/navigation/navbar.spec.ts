// tests/navigation/navbar.spec.ts
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
      authenticatedPage
        .getByRole("button", { name: /avatar|user|menu/i })
        .or(authenticatedPage.locator("[data-testid='user-avatar']"))
        .first(),
    ).toBeVisible();
  });

  test("authenticated: Create Game button visible on desktop", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en");
    await expect(
      authenticatedPage.getByRole("link", { name: "Create Game" }),
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
    // Open the avatar menu
    const avatarButton = authenticatedPage
      .getByRole("button", { name: /avatar|user|menu/i })
      .or(authenticatedPage.locator("[data-testid='user-avatar']"))
      .first();
    await avatarButton.click();
    await expect(
      authenticatedPage.getByRole("menuitem", { name: /profile/i }).or(
        authenticatedPage.getByRole("link", { name: /profile/i }),
      ),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("menuitem", { name: /settings/i }).or(
        authenticatedPage.getByRole("link", { name: /settings/i }),
      ),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("menuitem", { name: /sign out/i }).or(
        authenticatedPage.getByRole("button", { name: /sign out/i }),
      ),
    ).toBeVisible();
  });
});
