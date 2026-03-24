import { http, HttpResponse, passthrough } from "msw";
import { test, expect, withMeGuard } from "../fixtures/test-fixtures";
import {
  mockGameDetailResponse,
} from "../fixtures/mock-data/games";
import { mockMeResponse } from "../fixtures/mock-data/me";
import { buildConnection } from "../fixtures/mock-data/connection";
import {
  mockImageMedia,
  mockVideoMedia,
  mockLivestreamMedia,
  mockLinkMedia,
  mockResolveUrlResponse,
  mockAddGameMediaLinkResponse,
  mockDuplicateMediaError,
} from "../fixtures/mock-data/game-media";

function gameWithMedia(...mediaItems: Record<string, unknown>[]) {
  return () =>
    mockGameDetailResponse({
      gameStatus: "IN_PROGRESS",
      media: buildConnection(mediaItems),
    });
}

function multiOperationHandler(
  responses: Record<string, () => unknown>,
) {
  return [
    http.post("*/graphql", async ({ request }) => {
      const body = (await request.json()) as { query: string };
      const queryStr = body.query;

      if (/\bme\s*\{/.test(queryStr)) {
        return HttpResponse.json(mockMeResponse());
      }

      for (const [field, factory] of Object.entries(responses)) {
        if (new RegExp(`\\b${field}\\s*[({]`).test(queryStr)) {
          return HttpResponse.json(factory() as Record<string, unknown>);
        }
      }

      return HttpResponse.json({ data: {} });
    }),
    http.all("*", () => passthrough()),
  ];
}

test.describe("Game Media Gallery", () => {
  test("renders uploaded image in gallery", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      withMeGuard(gameWithMedia(mockImageMedia({ title: "My Photo" }))),
    );
    await authenticatedPage.goto("/en/game/game-1");
    await expect(
      authenticatedPage.getByAltText("My Photo"),
    ).toBeVisible();
  });

  test("renders video embed thumbnail in gallery", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(withMeGuard(gameWithMedia(mockVideoMedia())));
    await authenticatedPage.goto("/en/game/game-1");
    await expect(
      authenticatedPage.getByAltText("Game Highlights"),
    ).toBeVisible();
  });

  test("renders link card in gallery", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      withMeGuard(
        gameWithMedia(
          mockLinkMedia({ title: "Game Recap Article", thumbnailUrl: null }),
        ),
      ),
    );
    await authenticatedPage.goto("/en/game/game-1");
    await expect(
      authenticatedPage.getByText("Game Recap Article").first(),
    ).toBeVisible();
  });

  test("renders mixed media types", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      withMeGuard(
        gameWithMedia(
          mockImageMedia({ id: "img-1", title: "Photo 1" }),
          mockVideoMedia({ id: "vid-1", title: "Video 1" }),
          mockLinkMedia({
            id: "link-1",
            title: "Article 1",
            thumbnailUrl: null,
          }),
        ),
      ),
    );
    await authenticatedPage.goto("/en/game/game-1");
    await expect(authenticatedPage.getByAltText("Photo 1")).toBeVisible();
    await expect(authenticatedPage.getByAltText("Video 1")).toBeVisible();
    await expect(
      authenticatedPage.getByText("Article 1").first(),
    ).toBeVisible();
  });

  test("shows empty state with upload prompt when no media", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      withMeGuard(() =>
        mockGameDetailResponse({
          gameStatus: "IN_PROGRESS",
          viewerGameRole: "ORGANIZER",
        }),
      ),
    );
    await authenticatedPage.goto("/en/game/game-1");
    await expect(
      authenticatedPage.getByText(/no media yet/i),
    ).toBeVisible();
  });
});

test.describe("Livestream Display", () => {
  test("renders livestream section above gallery", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      withMeGuard(
        gameWithMedia(
          mockLivestreamMedia({ title: "Live Game Stream" }),
          mockImageMedia({ id: "img-1" }),
        ),
      ),
    );
    await authenticatedPage.goto("/en/game/game-1");
    await expect(
      authenticatedPage.getByText("LIVE").first(),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByText("Live Game Stream").first(),
    ).toBeVisible();
  });
});

test.describe("Add Link Dialog", () => {
  test("opens dialog and shows URL input", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      withMeGuard(() =>
        mockGameDetailResponse({
          gameStatus: "IN_PROGRESS",
          viewerGameRole: "ORGANIZER",
        }),
      ),
    );
    await authenticatedPage.goto("/en/game/game-1");
    await authenticatedPage.getByRole("button", { name: /add link/i }).click();
    await expect(
      authenticatedPage.getByLabel(/url/i),
    ).toBeVisible();
  });

  test("resolves URL and shows preview", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      ...multiOperationHandler({
        game: () =>
          mockGameDetailResponse({
            gameStatus: "IN_PROGRESS",
            viewerGameRole: "ORGANIZER",
          }),
        resolveUrl: () => mockResolveUrlResponse(),
      }),
    );
    await authenticatedPage.goto("/en/game/game-1");
    await authenticatedPage.getByRole("button", { name: /add link/i }).click();
    const urlInput = authenticatedPage.getByLabel(/url/i);
    await expect(urlInput).toBeVisible();
    await urlInput.fill("https://www.youtube.com/watch?v=abc123");
    await authenticatedPage.getByRole("button", { name: /preview/i }).click();
    await expect(
      authenticatedPage.getByText("Test Video Title").first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("confirms link and adds media to gallery", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      ...multiOperationHandler({
        game: () =>
          mockGameDetailResponse({
            gameStatus: "IN_PROGRESS",
            viewerGameRole: "ORGANIZER",
          }),
        resolveUrl: () => mockResolveUrlResponse(),
        addGameMediaLink: () =>
          mockAddGameMediaLinkResponse({ title: "Added Video" }),
      }),
    );
    await authenticatedPage.goto("/en/game/game-1");
    await authenticatedPage.getByRole("button", { name: /add link/i }).click();
    const urlInput = authenticatedPage.getByLabel(/url/i);
    await expect(urlInput).toBeVisible();
    await urlInput.fill("https://www.youtube.com/watch?v=abc123");
    await authenticatedPage.getByRole("button", { name: /preview/i }).click();
    const previewTitle = authenticatedPage.getByText("Test Video Title").first();
    await expect(previewTitle).toBeVisible({ timeout: 10000 });
    await authenticatedPage.getByRole("button", { name: /^add$/i }).click();
    await expect(
      authenticatedPage.getByText(/link added/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("shows duplicate error when URL already exists", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(
      ...multiOperationHandler({
        game: () =>
          mockGameDetailResponse({
            gameStatus: "IN_PROGRESS",
            viewerGameRole: "ORGANIZER",
          }),
        resolveUrl: () => mockDuplicateMediaError(),
      }),
    );
    await authenticatedPage.goto("/en/game/game-1");
    await authenticatedPage.getByRole("button", { name: /add link/i }).click();
    const urlInput = authenticatedPage.getByLabel(/url/i);
    await expect(urlInput).toBeVisible();
    await urlInput.fill("https://www.youtube.com/watch?v=abc123");
    await authenticatedPage.getByRole("button", { name: /preview/i }).click();
    await expect(
      authenticatedPage.getByText(/already been added/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Public Game (Unauthenticated)", () => {
  test("unauthenticated user can view public game media", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en/game/game-1");
    await expect(
      unauthenticatedPage.getByLabel(/basketball/i).first(),
    ).toBeVisible();
  });

  test("unauthenticated user does not see upload or add link buttons", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en/game/game-1");
    await expect(
      unauthenticatedPage.getByRole("button", { name: /add link/i }),
    ).not.toBeVisible();
    await expect(
      unauthenticatedPage.getByRole("button", { name: /upload/i }),
    ).not.toBeVisible();
  });
});
