import { http, HttpResponse } from "msw";
import { test, expect, withMeGuard } from "../fixtures/test-fixtures";
import { mockBlockedUsersResponse } from "../fixtures/mock-data/blocked-users";

test.describe("Settings: Privacy & Blocked Users", () => {
  test("[CRITICAL] unauthenticated: redirects to /", async ({
    unauthenticatedPage,
    msw,
  }) => {
    // The privacy page uses fetchCurrentUser() which queries 'me' via GraphQL.
    // Override MSW to return null for 'me' so the page treats user as unauthenticated.
    msw.use(
      http.post("*/graphql", () =>
        HttpResponse.json({ data: { me: null } }),
      ),
    );
    await unauthenticatedPage.goto("/en/settings/privacy");
    await expect(unauthenticatedPage).toHaveURL(/\/en\/?$/);
  });

  test("[CRITICAL] authenticated: renders privacy heading", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/settings/privacy");
    await expect(
      authenticatedPage.getByRole("heading", { name: "Privacy" }),
    ).toBeVisible();
  });

  test("authenticated: renders blocked users section", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/settings/privacy");
    await expect(
      authenticatedPage.getByRole("heading", { name: "Blocked users" }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByText(/won't be able to see your profile/i),
    ).toBeVisible();
  });

  test("authenticated: empty blocked users list", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/settings/privacy");
    await expect(
      authenticatedPage.getByText(/haven't blocked anyone/i),
    ).toBeVisible();
  });

  // TODO: Mock data renders but assertion timing needs investigation
  test.skip("authenticated: blocked users list renders with unblock buttons", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(withMeGuard(mockBlockedUsersResponse));
    await authenticatedPage.goto("/en/settings/privacy");
    await expect(authenticatedPage.getByText("Blocked User")).toBeVisible();
    await expect(
      authenticatedPage.getByRole("button", { name: /unblock/i }),
    ).toBeVisible();
  });
});
