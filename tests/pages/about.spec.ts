// tests/pages/about.spec.ts
import { test, expect } from "../fixtures/test-fixtures";

test.describe("About Page", () => {
  test("renders without auth", async ({ unauthenticatedPage }) => {
    await unauthenticatedPage.goto("/en/resource/about");
    await expect(unauthenticatedPage).not.toHaveURL(/\/en\/?$/);
    await expect(
      unauthenticatedPage.getByRole("heading", { name: "About" }),
    ).toBeVisible();
  });

  test("shows Mission heading", async ({ unauthenticatedPage }) => {
    await unauthenticatedPage.goto("/en/resource/about");
    await expect(
      unauthenticatedPage.getByRole("heading", { name: "Mission" }),
    ).toBeVisible();
  });
});
