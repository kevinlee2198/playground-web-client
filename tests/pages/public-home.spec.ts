import { expect } from "@playwright/test";
import { test } from "../fixtures/test-fixtures";

test.describe("Unauthenticated Home Page", () => {
  test("[CRITICAL] shows hero tagline and description", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en");
    await expect(
      unauthenticatedPage.getByText("Where Friends Come to Play"),
    ).toBeVisible();
    await expect(
      unauthenticatedPage.getByText("Organize pickup games"),
    ).toBeVisible();
  });

  test("[CRITICAL] shows sport filter pills", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en");
    await expect(
      unauthenticatedPage.getByRole("button", { name: "All Sports" }),
    ).toBeVisible();
    await expect(unauthenticatedPage.getByText("🏀")).toBeVisible();
    await expect(unauthenticatedPage.getByText("🎾")).toBeVisible();
  });

  test("[CRITICAL] shows status filter chips", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en");
    await expect(
      unauthenticatedPage.getByRole("button", { name: "Upcoming" }),
    ).toBeVisible();
    await expect(
      unauthenticatedPage.getByRole("button", { name: "Live" }),
    ).toBeVisible();
    await expect(
      unauthenticatedPage.getByRole("button", { name: "Completed" }),
    ).toBeVisible();
  });

  test("sport filter updates URL params", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en");
    await unauthenticatedPage.getByText("🏀").click();
    await expect(unauthenticatedPage).toHaveURL(/sportType=BASKETBALL/);
  });

  test("status filter updates URL params", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en");
    await unauthenticatedPage
      .getByRole("button", { name: "Upcoming" })
      .click();
    await expect(unauthenticatedPage).toHaveURL(/gameStatus=SCHEDULED/);
  });

  test("shows Get Started link", async ({ unauthenticatedPage }) => {
    await unauthenticatedPage.goto("/en");
    await expect(
      unauthenticatedPage.getByText("Get Started"),
    ).toBeVisible();
  });
});
