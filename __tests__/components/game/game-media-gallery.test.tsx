import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

import { confirmGameMediaUpload, requestGameMediaUpload } from "@/app/[locale]/upload/actions";
import { uploadToS3 } from "@/lib/s3-upload";
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

function uploadPhotos(names: string[]) {
  cleanup();
  renderGallery(false, true);
  const input = document.querySelector<HTMLInputElement>("input[type=file]")!;
  fireEvent.change(input, {
    target: { files: names.map((name) => new File(["x"], name, { type: "image/jpeg" })) },
  });
}

function uploadPhoto() {
  uploadPhotos(["photo.jpg"]);
}

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

  it("passes the request's uploadHeaders to uploadToS3", async () => {
    const uploadHeaders = [
      { name: "content-type", value: "image/jpeg" },
      { name: "if-none-match", value: "*" },
    ];
    vi.mocked(requestGameMediaUpload).mockResolvedValueOnce({
      success: true,
      uploadUrl: "https://s3.example.com/put",
      resourceId: "res-1",
      uploadHeaders,
    });
    vi.mocked(uploadToS3).mockResolvedValueOnce({ success: false });
    uploadPhoto();
    await waitFor(() =>
      expect(uploadToS3).toHaveBeenCalledWith(
        expect.any(File),
        "https://s3.example.com/put",
        uploadHeaders,
      ),
    );
  });

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

  it("shows the wait copy when rate limited", async () => {
    vi.mocked(requestGameMediaUpload).mockResolvedValueOnce({
      ...failure,
      errorType: "RateLimitedError",
      retryAfterSeconds: 30,
    });
    uploadPhoto();
    await waitFor(() =>
      expect(toast.add).toHaveBeenCalledWith(
        expect.objectContaining({ title: "errors.uploadRateLimited" }),
      ),
    );
  });

  it("uses one toast id for every rate-limited file in a drop, and none for other reasons", async () => {
    vi.mocked(requestGameMediaUpload)
      .mockResolvedValueOnce({ ...failure, errorType: "RateLimitedError", retryAfterSeconds: 1 })
      .mockResolvedValueOnce({ ...failure, errorType: "RateLimitedError", retryAfterSeconds: 2 });
    uploadPhotos(["a.jpg", "b.jpg"]);
    await waitFor(() => expect(toast.add).toHaveBeenCalledTimes(2));
    const [first, second] = vi.mocked(toast.add).mock.calls.map(([options]) => options);
    expect(first.id).toBeTruthy();
    expect(first.id).toBe(second.id);

    vi.mocked(toast.add).mockClear();
    vi.mocked(requestGameMediaUpload).mockResolvedValueOnce({ ...failure, code: "FILE_TOO_LARGE" });
    uploadPhotos(["c.jpg"]);
    await waitFor(() => expect(toast.add).toHaveBeenCalledTimes(1));
    expect(vi.mocked(toast.add).mock.calls[0][0]).not.toHaveProperty("id");
  });

  it("falls back to the server message for an unrecognised failure", async () => {
    vi.mocked(requestGameMediaUpload).mockResolvedValueOnce(failure);
    uploadPhoto();
    await waitFor(() =>
      expect(toast.add).toHaveBeenCalledWith({ title: "raw server wording", type: "error" }),
    );
  });
});

describe("GameMediaGallery confirm-time rejection", () => {
  const uploadReady = {
    success: true as const,
    uploadUrl: "https://s3.example.com/put",
    resourceId: "res-1",
    uploadHeaders: [],
  };
  const confirmFailure = {
    success: false as const,
    errorType: "UploadRejectedError",
    message: "raw server wording",
    rejectionReason: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requestGameMediaUpload).mockResolvedValueOnce(uploadReady);
    vi.mocked(uploadToS3).mockResolvedValueOnce({ success: true });
  });

  it("shows the contentMismatch copy when confirm is rejected", async () => {
    vi.mocked(confirmGameMediaUpload).mockResolvedValueOnce({
      ...confirmFailure,
      rejectionReason: "CONTENT_MISMATCH",
    });
    uploadPhoto();
    await waitFor(() =>
      expect(toast.add).toHaveBeenCalledWith({ title: "errors.contentMismatch", type: "error" }),
    );
    expect(mockT).toHaveBeenCalledWith("errors.contentMismatch", { filename: "photo.jpg" });
    expect(await screen.findByRole("button", { name: "Dismiss" })).toBeDefined();
  });

  it("keeps saveFailed for other confirm failures", async () => {
    vi.mocked(confirmGameMediaUpload).mockResolvedValueOnce(confirmFailure);
    uploadPhoto();
    await waitFor(() =>
      expect(toast.add).toHaveBeenCalledWith({ title: "errors.saveFailed", type: "error" }),
    );
    expect(await screen.findByRole("button", { name: "Dismiss" })).toBeDefined();
  });
});
