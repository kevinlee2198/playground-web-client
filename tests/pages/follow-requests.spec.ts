import { test, expect, withMeGuard, withMeGuardMap } from "../fixtures/test-fixtures";
import { mockUserResponse } from "../fixtures/mock-data/user";
import {
  mockFollowRequestSentResponse,
  mockFollowUserResponse,
  mockFollowRequestsResponse,
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
      withMeGuardMap({
        user: mockUserResponse({
          profileVisibility: "PRIVATE",
          viewerFollowsUser: false,
          viewerSentFollowRequest: { id: "req-1" },
        }),
        followUser: mockFollowRequestSentResponse(),
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
      withMeGuardMap({
        user: mockUserResponse({
          profileVisibility: "PRIVATE",
          viewerFollowsUser: false,
          viewerSentFollowRequest: null,
        }),
        followUser: mockFollowRequestSentResponse(),
      }),
    );

    await authenticatedPage.goto("/en/user/otheruser");

    const followBtn = authenticatedPage.getByRole("button", { name: /follow other user/i });
    await expect(followBtn).toBeVisible();
    await followBtn.click();

    await expect(authenticatedPage.getByRole("button", { name: /cancel follow request/i })).toBeVisible({ timeout: 10000 });
  });

  test("follow button transitions to Following for public profile", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      withMeGuardMap({
        user: mockUserResponse({
          viewerFollowsUser: false,
          viewerSentFollowRequest: null,
        }),
        followUser: mockFollowUserResponse(),
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
      withMeGuardMap({
        user: mockUserResponse({
          viewerFollowsUser: false,
          viewerSentFollowRequest: { id: "req-1" },
        }),
        cancelFollowRequest: mockCancelFollowRequestResponse(),
      }),
    );

    await authenticatedPage.goto("/en/user/otheruser");

    const requestedBtn = authenticatedPage.getByRole("button", { name: /cancel follow request/i });
    await expect(requestedBtn).toBeVisible();
    await requestedBtn.click();

    await expect(authenticatedPage.getByRole("button", { name: /follow other user/i })).toBeVisible({ timeout: 10000 });
  });

  // --- Private Profile Gate ---

  test("[CRITICAL] private profile with pending request shows lock", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      withMeGuard(() => mockUserResponse({
        profileVisibility: "PRIVATE",
        viewerFollowsUser: false,
        viewerSentFollowRequest: { id: "req-1" },
      })),
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
      withMeGuard(() => mockFollowRequestsResponse()),
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
    await authenticatedPage.goto("/en/settings/privacy");
    await expect(authenticatedPage.getByText(/no pending follow requests/i)).toBeVisible({ timeout: 10000 });
  });

  test("settings: approve removes request from list", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      withMeGuardMap({
        followRequests: mockFollowRequestsResponse(),
        approveFollowRequest: mockApproveFollowRequestResponse(),
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
      withMeGuardMap({
        followRequests: mockFollowRequestsResponse(),
        declineFollowRequest: mockDeclineFollowRequestResponse(),
      }),
    );

    await authenticatedPage.goto("/en/settings/privacy");
    await expect(authenticatedPage.getByText("Requester User")).toBeVisible({ timeout: 10000 });

    await authenticatedPage.getByRole("button", { name: /decline/i }).first().click();

    await expect(authenticatedPage.getByText("Requester User")).not.toBeVisible({ timeout: 10000 });
  });
});
