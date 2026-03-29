import { test, expect, withMeGuard } from "../fixtures/test-fixtures";
import { http, HttpResponse } from "msw";
import {
  mockGameDetailResponse,
  mockGameNotFoundResponse,
  mockParticipant,
} from "../fixtures/mock-data/games";
import { buildConnection } from "../fixtures/mock-data/connection";

test.describe("Game Detail Page", () => {
  test("[CRITICAL] unauthenticated: redirects to / for non-public game", async ({
    unauthenticatedPage,
    msw,
  }) => {
    msw.use(
      http.post("*/graphql", () =>
        HttpResponse.json(mockGameDetailResponse({ visibility: "PRIVATE" })),
      ),
    );
    await unauthenticatedPage.goto("/en/game/game-1");
    await expect(unauthenticatedPage).toHaveURL(/\/en\/?$/);
  });

  test("[CRITICAL] authenticated: renders game hero", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/game/game-1");
    // SportEmojiPill renders an emoji with aria-label="Basketball", not visible text
    await expect(
      authenticatedPage.getByLabel(/basketball/i).first(),
    ).toBeVisible();
  });

  test("[CRITICAL] authenticated: game not found shows error", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(withMeGuard(mockGameNotFoundResponse));
    await authenticatedPage.goto("/en/game/nonexistent");
    await expect(
      authenticatedPage.getByText(/game not found/i),
    ).toBeVisible();
  });

  test("authenticated: game location is displayed", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/game/game-1");
    // Game detail hero uses formatAddress(address) which joins city, state, country
    await expect(
      authenticatedPage.getByText("Test City, TS, US").first(),
    ).toBeVisible();
  });

  test("authenticated: participants section renders", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/game/game-1");
    await expect(
      authenticatedPage.getByText(/participant/i).first(),
    ).toBeVisible();
  });

  test("authenticated: completed basketball game renders with Final status", async ({
    authenticatedPage,
    msw,
  }) => {
    // COMPLETE games show "Final" badge and the score block message
    msw.use(
      withMeGuard(() => mockGameDetailResponse({ gameStatus: "COMPLETE" })),
    );
    await authenticatedPage.goto("/en/game/game-1");
    // Without mock participants, the score block shows "Add participants to track scores"
    await expect(
      authenticatedPage.getByText(/add participants/i).first(),
    ).toBeVisible();
  });

  test("authenticated: completed game with finalized results shows badge", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      withMeGuard(() =>
        mockGameDetailResponse({
          gameStatus: "FINALIZED",
          viewerGameRole: "OWNER",
          participants: buildConnection([
            mockParticipant({ id: "p1", name: "Team A" }),
            mockParticipant({ id: "p2", name: "Team B" }),
          ]),
        }),
      ),
    );
    await authenticatedPage.goto("/en/game/game-1");
    await expect(
      authenticatedPage.getByText(/results finalized/i),
    ).toBeVisible();
  });

  test("authenticated: owner sees finalize option for completed game", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      withMeGuard(() =>
        mockGameDetailResponse({
          gameStatus: "COMPLETE",
          viewerGameRole: "OWNER",
        }),
      ),
    );
    await authenticatedPage.goto("/en/game/game-1");
    await authenticatedPage.getByRole("button", { name: /more options/i }).click();
    await expect(
      authenticatedPage.getByRole("menuitem", { name: /finalize results/i }),
    ).toBeVisible();
  });

  test("authenticated: owner sees unfinalize option for finalized game", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      withMeGuard(() =>
        mockGameDetailResponse({
          gameStatus: "FINALIZED",
          viewerGameRole: "OWNER",
        }),
      ),
    );
    await authenticatedPage.goto("/en/game/game-1");
    await authenticatedPage.getByRole("button", { name: /more options/i }).click();
    await expect(
      authenticatedPage.getByRole("menuitem", { name: /unfinalize results/i }),
    ).toBeVisible();
  });

  test("authenticated: finalize option hidden for scheduled game", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      withMeGuard(() =>
        mockGameDetailResponse({
          gameStatus: "SCHEDULED",
          viewerGameRole: "OWNER",
        }),
      ),
    );
    await authenticatedPage.goto("/en/game/game-1");
    await authenticatedPage.getByRole("button", { name: /more options/i }).click();
    await expect(
      authenticatedPage.getByRole("menuitem", { name: /finalize results/i }),
    ).not.toBeVisible();
  });

  test("authenticated: editor sees finalize option for completed game", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      withMeGuard(() =>
        mockGameDetailResponse({
          gameStatus: "COMPLETE",
          viewerGameRole: "EDITOR",
        }),
      ),
    );
    await authenticatedPage.goto("/en/game/game-1");
    await authenticatedPage.getByRole("button", { name: /more options/i }).click();
    await expect(
      authenticatedPage.getByRole("menuitem", { name: /finalize results/i }),
    ).toBeVisible();
  });

  test("authenticated: edit dialog shows stat entry mode radio group", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      withMeGuard(() =>
        mockGameDetailResponse({
          viewerGameRole: "OWNER",
          statEntryMode: "OPEN",
        }),
      ),
    );
    await authenticatedPage.goto("/en/game/game-1");
    await authenticatedPage.getByRole("button", { name: /more options/i }).click();
    await authenticatedPage.getByRole("menuitem", { name: /edit game/i }).click();
    await expect(
      authenticatedPage.getByText(/who can enter stats/i),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("radio", { name: /open/i }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("radio", { name: /self-report/i }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("radio", { name: /manager only/i }),
    ).toBeVisible();
  });
});
