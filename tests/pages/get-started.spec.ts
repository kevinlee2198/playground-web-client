import { test, expect } from "../fixtures/test-fixtures";

test.describe("Getting Started Page", () => {
  test("renders without auth", async ({ unauthenticatedPage }) => {
    await unauthenticatedPage.goto("/en/resource/get-started");
    await expect(
      unauthenticatedPage.getByRole("heading", { name: "Get in the Game" }),
    ).toBeVisible();
  });

  test("shows steps section", async ({ unauthenticatedPage }) => {
    await unauthenticatedPage.goto("/en/resource/get-started");
    await expect(
      unauthenticatedPage.getByRole("heading", { name: "How It Works" }),
    ).toBeVisible();
  });
});
