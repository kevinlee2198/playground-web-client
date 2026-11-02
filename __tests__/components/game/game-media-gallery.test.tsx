import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockT } = vi.hoisted(() => ({
  mockT: vi.fn((key: string, _values?: Record<string, unknown>) => key),
}));
vi.mock("next-intl", () => ({
  useTranslations: () => mockT,
}));
vi.mock("@/app/[locale]/game/actions", () => ({ loadGameMedia: vi.fn() }));
vi.mock("@/app/[locale]/game/media-actions", () => ({ deleteGameMedia: vi.fn() }));
vi.mock("@/app/[locale]/upload/actions", () => ({
  confirmGameMediaUpload: vi.fn(),
  requestGameMediaUpload: vi.fn(),
}));
vi.mock("@/lib/s3-upload", () => ({ uploadToS3: vi.fn() }));
vi.mock("@/components/ui/toast", () => ({ toast: { add: vi.fn() } }));
vi.mock("@/components/game/delete-media-dialog", () => ({
  DeleteMediaDialog: () => null,
}));
vi.mock("@/components/game/game-media-item", () => ({
  GameMediaItem: ({
    media,
    canDelete,
  }: {
    media: { id: string };
    canDelete: boolean;
  }) => (
    <div data-testid={`item-${media.id}`}>
      {canDelete && <button type="button">delete-{media.id}</button>}
    </div>
  ),
}));

import { requestGameMediaUpload } from "@/app/[locale]/upload/actions";
import { toast } from "@/components/ui/toast";
import { GameMediaGallery } from "@/components/game/game-media-gallery";
import { GameVisibility } from "@/lib/constants";
import type { ImageMediaNode } from "@/lib/types/game-media";

function edge(id: string, addedById: number) {
  const node: ImageMediaNode = {
    __typename: "ImageMedia",
    id,
    source: "UPLOAD",
    url: `https://s3.example.com/${id}.jpg`,
    thumbnailUrl: null,
    title: id,
    addedBy: { id: addedById, displayName: `User ${addedById}`, username: `u${addedById}` },
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: null,
  };
  return { cursor: id, node };
}

function renderGallery(canModerateMedia: boolean, canContribute = false) {
  render(
    <GameMediaGallery
      gameId={1}
      media={[edge("own", 7), edge("other", 8)]}
      pageInfo={{
        hasPreviousPage: false,
        hasNextPage: false,
        startCursor: null,
        endCursor: null,
      }}
      canContribute={canContribute}
      currentUserId={7}
      canModerateMedia={canModerateMedia}
      gameVisibility={GameVisibility.PUBLIC}
      onMediaAdded={vi.fn()}
      onMediaDeleted={vi.fn()}
      onMediaLoaded={vi.fn()}
    />,
  );
}

describe("GameMediaGallery delete rule", () => {
  it("without moderation, offers delete only on the viewer's own item", () => {
    renderGallery(false);
    expect(screen.getByText("delete-own")).toBeInTheDocument();
    expect(screen.queryByText("delete-other")).not.toBeInTheDocument();
  });

  it("with moderation, offers delete on every item", () => {
    renderGallery(true);
    expect(screen.getByText("delete-own")).toBeInTheDocument();
    expect(screen.getByText("delete-other")).toBeInTheDocument();
  });
});

describe("GameMediaGallery request-time upload errors", () => {
  const failure = {
    success: false as const,
    errorType: "InvalidInputError",
    message: "raw server wording",
    code: null,
    isAuthorizationError: false,
    retryAfterSeconds: null,
  };

  beforeEach(() => vi.clearAllMocks());

  function uploadPhoto() {
    renderGallery(false, true);
    const input = document.querySelector<HTMLInputElement>("input[type=file]")!;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "photo.jpg", { type: "image/jpeg" })] },
    });
  }

  it("shows the size copy when the server returns FILE_TOO_LARGE", async () => {
    vi.mocked(requestGameMediaUpload).mockResolvedValueOnce({ ...failure, code: "FILE_TOO_LARGE" });
    uploadPhoto();
    await waitFor(() =>
      expect(toast.add).toHaveBeenCalledWith({ title: "errors.fileTooLarge", type: "error" }),
    );
    // photo.jpg is an image, so the image limit applies
    expect(mockT).toHaveBeenCalledWith(
      "errors.fileTooLarge",
      expect.objectContaining({ limit: "10 MB" }),
    );
  });

  it("shows the countdown copy when rate limited", async () => {
    vi.mocked(requestGameMediaUpload).mockResolvedValueOnce({
      ...failure,
      errorType: "RateLimitedError",
      retryAfterSeconds: 30,
    });
    uploadPhoto();
    await waitFor(() =>
      expect(toast.add).toHaveBeenCalledWith({ title: "errors.uploadRateLimited", type: "error" }),
    );
    expect(mockT).toHaveBeenCalledWith(
      "errors.uploadRateLimited",
      expect.objectContaining({ seconds: 30 }),
    );
  });

  it("defaults the countdown to 60 seconds when retryAfterSeconds is null", async () => {
    vi.mocked(requestGameMediaUpload).mockResolvedValueOnce({
      ...failure,
      errorType: "RateLimitedError",
    });
    uploadPhoto();
    await waitFor(() =>
      expect(mockT).toHaveBeenCalledWith(
        "errors.uploadRateLimited",
        expect.objectContaining({ seconds: 60 }),
      ),
    );
  });

  it("falls back to the server message for an unrecognised failure", async () => {
    vi.mocked(requestGameMediaUpload).mockResolvedValueOnce(failure);
    uploadPhoto();
    await waitFor(() =>
      expect(toast.add).toHaveBeenCalledWith({ title: "raw server wording", type: "error" }),
    );
  });
});
