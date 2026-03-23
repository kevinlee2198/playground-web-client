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
    await expect(
      unauthenticatedPage.getByRole("button", { name: "Basketball" }),
    ).toBeVisible();
    await expect(
      unauthenticatedPage.getByRole("button", { name: "Tennis" }),
    ).toBeVisible();
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

  test("sport filter renders selected state from URL", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en?sportType=BASKETBALL");
    await expect(
      unauthenticatedPage.getByRole("button", { name: "Basketball" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      unauthenticatedPage.getByRole("button", { name: "All Sports" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  test("status filter renders selected state from URL", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en?gameStatus=SCHEDULED");
    await expect(
      unauthenticatedPage.getByRole("button", { name: "Upcoming" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("shows Get Started link", async ({ unauthenticatedPage }) => {
    await unauthenticatedPage.goto("/en");
    await expect(
      unauthenticatedPage.getByText("Get Started"),
    ).toBeVisible();
  });
});
