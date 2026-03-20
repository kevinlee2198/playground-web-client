import { test, expect } from "../fixtures/test-fixtures";

test.describe("Footer", () => {
  test("footer is visible", async ({ unauthenticatedPage }) => {
    await unauthenticatedPage.goto("/en/resource/about");
    await expect(unauthenticatedPage.locator("footer")).toBeVisible();
  });

  test("About and Contact links present", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en/resource/about");
    const footer = unauthenticatedPage.locator("footer");
    await expect(footer.getByRole("link", { name: "About" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Contact" })).toBeVisible();
  });

  test("copyright includes current year", async ({ unauthenticatedPage }) => {
    await unauthenticatedPage.goto("/en/resource/about");
    const year = new Date().getFullYear().toString();
    await expect(
      unauthenticatedPage.getByText(year),
    ).toBeVisible();
  });
});
