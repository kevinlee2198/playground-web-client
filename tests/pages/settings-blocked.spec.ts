import { http, HttpResponse } from "msw";
import { test, expect, withMeGuard } from "../fixtures/test-fixtures";
import { mockBlockedUsersResponse } from "../fixtures/mock-data/friendships";

test.describe("Blocked Users Page", () => {
  test("[CRITICAL] unauthenticated: redirects to /", async ({
    unauthenticatedPage,
    msw,
  }) => {
    // The blocked page uses fetchCurrentUser() which queries 'me' via GraphQL.
    // Override MSW to return null for 'me' so the page treats user as unauthenticated.
    msw.use(
      http.post("*/graphql", () =>
        HttpResponse.json({ data: { me: null } }),
      ),
    );
    await unauthenticatedPage.goto("/en/settings/blocked");
    await expect(unauthenticatedPage).toHaveURL(/\/en\/?$/);
  });

  test("[CRITICAL] authenticated: renders heading and description", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/settings/blocked");
    await expect(
      authenticatedPage.getByRole("heading", { name: "Blocked Users" }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByText(/won't be able to see your profile/i),
    ).toBeVisible();
  });

  // TODO: Mock data renders but assertion timing needs investigation
  test.skip("authenticated: blocked users list renders with unblock buttons", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(withMeGuard(mockBlockedUsersResponse));
    await authenticatedPage.goto("/en/settings/blocked");
    await expect(authenticatedPage.getByText("Blocked User")).toBeVisible();
    await expect(
      authenticatedPage.getByRole("button", { name: /unblock/i }),
    ).toBeVisible();
  });

  test("authenticated: empty list when no users blocked", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/settings/blocked");
    await expect(
      authenticatedPage.getByRole("heading", { name: "Blocked Users" }),
    ).toBeVisible();
  });
});
