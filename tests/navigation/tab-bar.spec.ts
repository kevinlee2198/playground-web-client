import { test, expect } from "../fixtures/test-fixtures";

test.describe("Tab Bar", () => {
  test("[CRITICAL] unauthenticated: tab bar NOT visible", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en");
    await expect(
      unauthenticatedPage.getByRole("link", { name: "Feed" }),
    ).not.toBeVisible();
  });

  test("[CRITICAL] authenticated: shows all tabs", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en");
    await expect(
      authenticatedPage.getByRole("link", { name: "Feed" }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("link", { name: "Games" }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("link", { name: "Messages" }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("link", { name: "Profile" }),
    ).toBeVisible();
  });

  test("authenticated: each tab links to correct route", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en");
    await expect(
      authenticatedPage.getByRole("link", { name: "Feed" }),
    ).toHaveAttribute("href", /\/en\/?$/);
    await expect(
      authenticatedPage.getByRole("link", { name: "Games" }),
    ).toHaveAttribute("href", /\/games/);
    await expect(
      authenticatedPage.getByRole("link", { name: "Messages" }),
    ).toHaveAttribute("href", /\/chat/);
    // Profile tab href loads async — wait for it to update from "/" to "/user/testuser"
    await expect(
      authenticatedPage.getByRole("link", { name: "Profile" }),
    ).toHaveAttribute("href", /\/user\/testuser/, { timeout: 5000 });
  });

  test("authenticated: active tab is visually highlighted", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en");
    const feedTab = authenticatedPage.getByRole("link", { name: "Feed" });
    await expect(feedTab).toBeVisible();
    await expect(feedTab).toHaveAttribute("aria-current", "page");
  });
});
