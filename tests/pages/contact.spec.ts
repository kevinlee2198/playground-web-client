import { test, expect } from "../fixtures/test-fixtures";

test.describe("Contact Page", () => {
  test("renders without auth", async ({ unauthenticatedPage }) => {
    await unauthenticatedPage.goto("/en/resource/contact");
    await expect(
      unauthenticatedPage.getByRole("heading", { name: "Contact Us" }),
    ).toBeVisible();
  });

  test("shows email and phone", async ({ unauthenticatedPage }) => {
    await unauthenticatedPage.goto("/en/resource/contact");
    await expect(
      unauthenticatedPage.getByText("playgroundsocool@gmail.com"),
    ).toBeVisible();
  });
});
