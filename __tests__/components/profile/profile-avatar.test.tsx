import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockT } = vi.hoisted(() => ({
  mockT: vi.fn((key: string, _values?: Record<string, unknown>) => key),
}));
vi.mock("next-intl", () => ({
  useTranslations: () => mockT,
}));
vi.mock("@/app/[locale]/upload/actions", () => ({
  confirmUpload: vi.fn(),
  deleteResource: vi.fn(),
  requestProfilePictureUpload: vi.fn(),
}));
vi.mock("@/lib/s3-upload", () => ({ uploadToS3: vi.fn() }));
vi.mock("@/components/ui/toast", () => ({ toast: { add: vi.fn() } }));

import {
  confirmUpload,
  deleteResource,
  requestProfilePictureUpload,
} from "@/app/[locale]/upload/actions";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { toast } from "@/components/ui/toast";
import { uploadToS3 } from "@/lib/s3-upload";
import type { ImageResource } from "@/lib/types/resource";

function image(id: string): ImageResource {
  return {
    __typename: "ImageResource",
    id,
    filename: `${id}.png`,
    size: 4,
    mimeType: "image/png",
    downloadUrl: `https://s3.example.com/${id}.png`,
    createdDate: "2025-01-01T00:00:00Z",
    width: null,
    height: null,
    thumbnailUrl: null,
  };
}

const uploadHeaders = [
  { name: "content-type", value: "image/png" },
  { name: "if-none-match", value: "*" },
];

function renderAvatar() {
  const { container } = render(
    <ProfileAvatar
      user={{
        id: 1,
        firstName: "Ada",
        lastName: "Lovelace",
        displayName: "Ada",
        profilePicture: image("old"),
      }}
    />,
  );
  return container.querySelector<HTMLInputElement>('input[type="file"]')!;
}

async function selectAndConfirmUpload(input: HTMLInputElement) {
  const file = new File(["data"], "new.png", { type: "image/png" });
  fireEvent.change(input, { target: { files: [file] } });
  fireEvent.click(await screen.findByRole("button", { name: "preview.confirm" }));
  return file;
}

describe("ProfileAvatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
    vi.mocked(requestProfilePictureUpload).mockResolvedValue({
      success: true,
      uploadUrl: "https://s3.example.com/put",
      resourceId: "new",
      uploadHeaders,
    });
    vi.mocked(uploadToS3).mockResolvedValue({ success: true });
    vi.mocked(confirmUpload).mockResolvedValue({ success: true, resource: image("new") });
    vi.mocked(deleteResource).mockResolvedValue({ success: true });
  });

  afterEach(cleanup);

  it("does not delete the previous picture after a successful upload", async () => {
    await selectAndConfirmUpload(renderAvatar());

    await waitFor(() =>
      expect(toast.add).toHaveBeenCalledWith({ title: "success", type: "success" }),
    );
    expect(confirmUpload).toHaveBeenCalledWith("new");
    expect(deleteResource).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "preview.confirm" })).toBeNull(),
    );
    expect(screen.getByRole("button", { name: "remove" })).toBeDefined();
  });

  it("passes the request's uploadHeaders to uploadToS3", async () => {
    const file = await selectAndConfirmUpload(renderAvatar());

    await waitFor(() => expect(uploadToS3).toHaveBeenCalled());
    expect(uploadToS3).toHaveBeenCalledWith(
      file,
      "https://s3.example.com/put",
      uploadHeaders,
    );
  });

  it("shows the contentMismatch copy when confirm rejects the content", async () => {
    vi.mocked(confirmUpload).mockResolvedValue({
      success: false,
      errorType: "UploadRejectedError",
      message: "rejected",
      rejectionReason: "CONTENT_MISMATCH",
    });
    await selectAndConfirmUpload(renderAvatar());

    await waitFor(() =>
      expect(toast.add).toHaveBeenCalledWith({
        title: "errors.contentMismatch",
        type: "error",
      }),
    );
    expect(deleteResource).not.toHaveBeenCalled();
  });

  it("still deletes the picture on Remove", async () => {
    renderAvatar();

    fireEvent.click(screen.getByRole("button", { name: "remove" }));
    fireEvent.click(await screen.findByRole("button", { name: "confirm" }));

    await waitFor(() => expect(deleteResource).toHaveBeenCalledWith("old"));
    expect(deleteResource).toHaveBeenCalledTimes(1);
  });
});
