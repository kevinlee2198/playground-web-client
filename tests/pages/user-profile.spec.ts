// tests/pages/user-profile.spec.ts
import { http, HttpResponse } from "msw";
import { test, expect } from "../fixtures/test-fixtures";
import { mockMeResponse } from "../fixtures/mock-data/me";
import {
  mockOwnUserResponse,
  mockUserNotFoundResponse,
} from "../fixtures/mock-data/user";

test.describe("User Profile Page", () => {
  test("[CRITICAL] unauthenticated: public profile renders", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en/user/otheruser");
    await expect(unauthenticatedPage.getByRole("heading", { name: "Other User" })).toBeVisible();
    await expect(unauthenticatedPage.getByText("@otheruser")).toBeVisible();
  });

  test("[CRITICAL] authenticated own profile: renders with edit", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      http.post("*/graphql", async ({ request }) => {
        const body = (await request.json()) as { query: string };
        if (/\bme\s*\{/.test(body.query)) return HttpResponse.json(mockMeResponse());
        if (/\buser\s*[\({]/.test(body.query)) return HttpResponse.json(mockOwnUserResponse());
        return HttpResponse.json({ data: {} });
      }),
    );
    await authenticatedPage.goto("/en/user/testuser");
    await expect(authenticatedPage.getByRole("heading", { name: "Test User" })).toBeVisible();
  });

  test("authenticated other profile: renders", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/user/otheruser");
    await expect(authenticatedPage.getByRole("heading", { name: "Other User" })).toBeVisible();
  });

  test("[CRITICAL] profile not found: shows 404", async ({
    unauthenticatedPage,
    msw,
  }) => {
    msw.use(
      http.post("*/graphql", () => HttpResponse.json(mockUserNotFoundResponse())),
    );
    await unauthenticatedPage.goto("/en/user/doesnotexist");
    await expect(unauthenticatedPage.getByText("404")).toBeVisible();
    await expect(
      unauthenticatedPage.getByText("User not found"),
    ).toBeVisible();
  });

  test("player stats section renders", async ({ unauthenticatedPage }) => {
    await unauthenticatedPage.goto("/en/user/otheruser");
    await expect(
      unauthenticatedPage.getByText(/age|height|weight/i).first(),
    ).toBeVisible();
  });

  test("game history section renders", async ({ unauthenticatedPage }) => {
    await unauthenticatedPage.goto("/en/user/otheruser");
    await expect(
      unauthenticatedPage.getByText(/game.*history|recent.*games/i).first(),
    ).toBeVisible();
  });
});
