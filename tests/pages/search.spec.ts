import { test, expect } from "../fixtures/test-fixtures";

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
    await expect(
      unauthenticatedPage
        .getByRole("searchbox")
        .or(unauthenticatedPage.getByPlaceholder(/search/i)),
    ).toBeVisible();
  });

  test("search results render with query param", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en/search?q=found");
    await expect(
      unauthenticatedPage.getByText("Found User"),
    ).toBeVisible();
  });

  test("empty results show no results message", async ({
    unauthenticatedPage,
    msw,
  }) => {
    const { mockEmptySearchResponse } = await import(
      "../fixtures/mock-data/search"
    );
    const { http, HttpResponse } = await import("msw");
    msw.use(
      http.post("*/graphql", () =>
        HttpResponse.json(mockEmptySearchResponse()),
      ),
    );
    await unauthenticatedPage.goto("/en/search?q=nonexistent");
    await expect(
      unauthenticatedPage.getByText(/no.*result/i),
    ).toBeVisible();
  });
});
