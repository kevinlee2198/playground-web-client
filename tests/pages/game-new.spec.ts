import { test, expect } from "../fixtures/test-fixtures";

test.describe("Create Game Page", () => {
  test("[CRITICAL] unauthenticated: redirects to /", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en/games/new");
    await expect(unauthenticatedPage).toHaveURL(/\/en\/?$/);
  });

  test("[CRITICAL] authenticated: renders Create Game heading", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/games/new");
    await expect(
      authenticatedPage.getByRole("heading", { name: "Create Game" }),
    ).toBeVisible();
  });

  test("authenticated: back button is visible", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/games/new");
    const back = authenticatedPage.getByRole("button", {
      name: /back to games/i,
    });
    await expect(back).toBeVisible();
  });

  test("authenticated: form renders with sport type selector", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/games/new");
    await expect(
      authenticatedPage.getByText(/sport/i).first(),
    ).toBeVisible();
  });
});
