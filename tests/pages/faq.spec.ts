import { test, expect } from "../fixtures/test-fixtures";

test.describe("FAQ Page", () => {
  test("renders without auth", async ({ unauthenticatedPage }) => {
    await unauthenticatedPage.goto("/en/resource/frequently-asked-questions");
    await expect(
      unauthenticatedPage.getByRole("heading", {
        name: "Frequently Asked Questions",
      }),
    ).toBeVisible();
  });

  test("shows questions", async ({ unauthenticatedPage }) => {
    await unauthenticatedPage.goto("/en/resource/frequently-asked-questions");
    await expect(
      unauthenticatedPage.getByRole("heading", {
        name: "Is Playground free?",
      }),
    ).toBeVisible();
  });
});
