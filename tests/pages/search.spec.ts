// tests/pages/search.spec.ts
import { http, HttpResponse } from "msw";
import { test, expect } from "../fixtures/test-fixtures";
import { mockEmptySearchResponse } from "../fixtures/mock-data/search";

test.describe("Search Page", () => {
  test("[CRITICAL] renders without auth", async ({ unauthenticatedPage }) => {
    await unauthenticatedPage.goto("/en/search");
    await expect(
      unauthenticatedPage.getByRole("heading", { name: "Search" }),
    ).toBeVisible();
  });

  test("[CRITICAL] search input is visible", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en/search");
    // The Input component uses base-ui InputPrimitive without type="search",
    // so searchbox role is not available. Use placeholder instead.
    // Use .first() in case both the navbar and page search inputs are visible.
    await expect(
      unauthenticatedPage.getByPlaceholder(/search/i).first(),
    ).toBeVisible();
  });

  test("search results render with query param", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en/search?q=found");
    await expect(unauthenticatedPage.getByText("Found User")).toBeVisible();
  });

  test("empty results show no results message", async ({
    unauthenticatedPage,
    msw,
  }) => {
    msw.use(
      http.post("*/graphql", () => HttpResponse.json(mockEmptySearchResponse())),
    );
    await unauthenticatedPage.goto("/en/search?q=nonexistent");
    // The i18n key search.noResults resolves to "No users found"
    await expect(unauthenticatedPage.getByText(/no users found/i)).toBeVisible();
  });
});
