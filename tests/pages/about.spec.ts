import { test, expect } from "../fixtures/test-fixtures";

test.describe("About Page", () => {
  test("renders without auth", async ({ unauthenticatedPage }) => {
    await unauthenticatedPage.goto("/en/resource/about");
    await expect(unauthenticatedPage).not.toHaveURL(/\/en\/?$/);
    await expect(
      unauthenticatedPage.getByRole("heading", {
        name: "Where Friends Come to Play",
      }),
    ).toBeVisible();
  });

  test("shows feature and team sections", async ({ unauthenticatedPage }) => {
    await unauthenticatedPage.goto("/en/resource/about");
    await expect(
      unauthenticatedPage.getByRole("heading", { name: "What You Can Do" }),
    ).toBeVisible();
    await expect(
      unauthenticatedPage.getByRole("heading", { name: "The Crew" }),
    ).toBeVisible();
  });
});
