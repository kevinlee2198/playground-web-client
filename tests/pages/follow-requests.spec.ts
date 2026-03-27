import { http, HttpResponse } from "msw";
import { test, expect } from "../fixtures/test-fixtures";
import { mockMeResponse } from "../fixtures/mock-data/me";
import { mockUserResponse } from "../fixtures/mock-data/user";
import {
  mockFollowRequestSentResponse,
  mockFollowUserResponse,
  mockFollowRequestsResponse,
  mockEmptyFollowRequestsResponse,
  mockApproveFollowRequestResponse,
  mockDeclineFollowRequestResponse,
  mockCancelFollowRequestResponse,
} from "../fixtures/mock-data/follow-requests";

test.describe("Follow Requests", () => {

  // --- Follow Button: Requested State ---

  test("[CRITICAL] follow button shows Requested for private profile", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      http.post("*/graphql", async ({ request }) => {
        const body = (await request.json()) as { query: string };
        if (/\bme\s*\{/.test(body.query)) return HttpResponse.json(mockMeResponse());
        if (/\buser\s*[\({]/.test(body.query)) {
          return HttpResponse.json(mockUserResponse({
            profileVisibility: "PRIVATE",
            viewerFollowsUser: false,
            viewerSentFollowRequest: { id: "req-1" },
          }));
        }
        if (/\bfollowUser\s*[\({]/.test(body.query)) {
          return HttpResponse.json(mockFollowRequestSentResponse());
        }
        return HttpResponse.json({ data: {} });
      }),
    );

    await authenticatedPage.goto("/en/user/otheruser");
    const button = authenticatedPage.getByRole("button", { name: /cancel follow request/i });
    await expect(button).toBeVisible();
    await expect(button).toHaveText("Requested");
  });

  test("follow button transitions to Requested when following private profile", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      http.post("*/graphql", async ({ request }) => {
        const body = (await request.json()) as { query: string };
        if (/\bme\s*\{/.test(body.query)) return HttpResponse.json(mockMeResponse());
        // Check followUser before user: mutation query contains "user {" in its fragments
        if (/\bfollowUser\s*[\({]/.test(body.query)) {
          return HttpResponse.json(mockFollowRequestSentResponse());
        }
        if (/\buser\s*[\({]/.test(body.query)) {
          return HttpResponse.json(mockUserResponse({
            profileVisibility: "PRIVATE",
            viewerFollowsUser: false,
            viewerSentFollowRequest: null,
          }));
        }
        return HttpResponse.json({ data: {} });
      }),
    );

    await authenticatedPage.goto("/en/user/otheruser");

    // Should show Follow button initially
    const followBtn = authenticatedPage.getByRole("button", { name: /follow other user/i });
    await expect(followBtn).toBeVisible();

    // Click follow
    await followBtn.click();

    // Should transition to Requested (wait up to 10s for server action to resolve)
    await expect(authenticatedPage.getByRole("button", { name: /cancel follow request/i })).toBeVisible({ timeout: 10000 });
  });

  test("follow button transitions to Following for public profile", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      http.post("*/graphql", async ({ request }) => {
        const body = (await request.json()) as { query: string };
        if (/\bme\s*\{/.test(body.query)) return HttpResponse.json(mockMeResponse());
        // Check followUser before user: mutation query contains "user {" in its fragments
        if (/\bfollowUser\s*[\({]/.test(body.query)) {
          return HttpResponse.json(mockFollowUserResponse());
        }
        if (/\buser\s*[\({]/.test(body.query)) {
          return HttpResponse.json(mockUserResponse({
            viewerFollowsUser: false,
            viewerSentFollowRequest: null,
          }));
        }
        return HttpResponse.json({ data: {} });
      }),
    );

    await authenticatedPage.goto("/en/user/otheruser");

    const followBtn = authenticatedPage.getByRole("button", { name: /follow other user/i });
    await expect(followBtn).toBeVisible();
    await followBtn.click();

    await expect(authenticatedPage.getByRole("button", { name: /unfollow other user/i })).toBeVisible({ timeout: 10000 });
  });

  test("cancel follow request returns to Follow state", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      http.post("*/graphql", async ({ request }) => {
        const body = (await request.json()) as { query: string };
        if (/\bme\s*\{/.test(body.query)) return HttpResponse.json(mockMeResponse());
        if (/\buser\s*[\({]/.test(body.query)) {
          return HttpResponse.json(mockUserResponse({
            viewerFollowsUser: false,
            viewerSentFollowRequest: { id: "req-1" },
          }));
        }
        if (/\bcancelFollowRequest\s*[\({]/.test(body.query)) {
          return HttpResponse.json(mockCancelFollowRequestResponse());
        }
        return HttpResponse.json({ data: {} });
      }),
    );

    await authenticatedPage.goto("/en/user/otheruser");

    // Should show Requested initially
    const requestedBtn = authenticatedPage.getByRole("button", { name: /cancel follow request/i });
    await expect(requestedBtn).toBeVisible();

    // Click to cancel
    await requestedBtn.click();

    // Should return to Follow
    await expect(authenticatedPage.getByRole("button", { name: /follow other user/i })).toBeVisible({ timeout: 10000 });
  });

  // --- Private Profile Gate ---

  test("[CRITICAL] private profile with pending request shows lock", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      http.post("*/graphql", async ({ request }) => {
        const body = (await request.json()) as { query: string };
        if (/\bme\s*\{/.test(body.query)) return HttpResponse.json(mockMeResponse());
        if (/\buser\s*[\({]/.test(body.query)) {
          return HttpResponse.json(mockUserResponse({
            profileVisibility: "PRIVATE",
            viewerFollowsUser: false,
            viewerSentFollowRequest: { id: "req-1" },
          }));
        }
        return HttpResponse.json({ data: {} });
      }),
    );

    await authenticatedPage.goto("/en/user/otheruser");
    await expect(authenticatedPage.getByText(/this account is private/i)).toBeVisible();
    await expect(authenticatedPage.getByRole("button", { name: /cancel follow request/i })).toBeVisible();
  });

  // --- Follow Requests Settings Page ---

  test("[CRITICAL] settings privacy page shows follow requests section", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      http.post("*/graphql", async ({ request }) => {
        const body = (await request.json()) as { query: string };
        if (/\bme\s*\{/.test(body.query)) return HttpResponse.json(mockMeResponse());
        if (/\bfollowRequests\s*[\({]/.test(body.query)) {
          return HttpResponse.json(mockFollowRequestsResponse());
        }
        return HttpResponse.json({ data: {} });
      }),
    );

    await authenticatedPage.goto("/en/settings/privacy");
    await expect(authenticatedPage.getByRole("heading", { name: /follow requests/i })).toBeVisible();
    await expect(authenticatedPage.getByText("Requester User")).toBeVisible({ timeout: 10000 });
    await expect(authenticatedPage.getByRole("button", { name: /approve/i }).first()).toBeVisible();
    await expect(authenticatedPage.getByRole("button", { name: /decline/i }).first()).toBeVisible();
  });

  test("settings: empty follow requests shows empty state", async ({
    authenticatedPage,
  }) => {
    // Default handler returns empty follow requests
    await authenticatedPage.goto("/en/settings/privacy");
    await expect(authenticatedPage.getByText(/no pending follow requests/i)).toBeVisible({ timeout: 10000 });
  });

  test("settings: approve removes request from list", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      http.post("*/graphql", async ({ request }) => {
        const body = (await request.json()) as { query: string };
        if (/\bme\s*\{/.test(body.query)) return HttpResponse.json(mockMeResponse());
        if (/\bfollowRequests\s*[\({]/.test(body.query)) {
          return HttpResponse.json(mockFollowRequestsResponse());
        }
        if (/\bapproveFollowRequest\s*[\({]/.test(body.query)) {
          return HttpResponse.json(mockApproveFollowRequestResponse());
        }
        return HttpResponse.json({ data: {} });
      }),
    );

    await authenticatedPage.goto("/en/settings/privacy");
    await expect(authenticatedPage.getByText("Requester User")).toBeVisible({ timeout: 10000 });

    await authenticatedPage.getByRole("button", { name: /approve/i }).first().click();

    await expect(authenticatedPage.getByText("Requester User")).not.toBeVisible({ timeout: 10000 });
  });

  test("settings: decline removes request from list", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      http.post("*/graphql", async ({ request }) => {
        const body = (await request.json()) as { query: string };
        if (/\bme\s*\{/.test(body.query)) return HttpResponse.json(mockMeResponse());
        if (/\bfollowRequests\s*[\({]/.test(body.query)) {
          return HttpResponse.json(mockFollowRequestsResponse());
        }
        if (/\bdeclineFollowRequest\s*[\({]/.test(body.query)) {
          return HttpResponse.json(mockDeclineFollowRequestResponse());
        }
        return HttpResponse.json({ data: {} });
      }),
    );

    await authenticatedPage.goto("/en/settings/privacy");
    await expect(authenticatedPage.getByText("Requester User")).toBeVisible({ timeout: 10000 });

    await authenticatedPage.getByRole("button", { name: /decline/i }).first().click();

    await expect(authenticatedPage.getByText("Requester User")).not.toBeVisible({ timeout: 10000 });
  });
});
