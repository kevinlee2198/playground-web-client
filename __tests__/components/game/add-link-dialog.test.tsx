import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/en.json";

// ---- Mocks ----

vi.mock("@/app/[locale]/game/media-actions", () => ({
  resolveUrl: vi.fn(),
  addGameMediaLink: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { AddLinkDialog } from "@/components/game/add-link-dialog";
import type { GameMediaNode, ResolveUrlPreview } from "@/lib/types/game-media";

// ---- Fixtures ----

function makePreview(
  overrides: Partial<ResolveUrlPreview> = {},
): ResolveUrlPreview {
  return {
    type: "VIDEO",
    source: "YOUTUBE",
    resolvedUrl: "https://youtube.com/watch?v=abc123",
    title: "Sample Video Title",
    description: "A sample description",
    thumbnailUrl: "https://img.youtube.com/vi/abc123/hqdefault.jpg",
    embedUrl: "https://www.youtube.com/embed/abc123",
    embedWidth: 560,
    embedHeight: 315,
    ...overrides,
  };
}

function makeGameMedia(overrides: Partial<GameMediaNode> = {}): GameMediaNode {
  return {
    __typename: "VideoMedia",
    id: "media-1",
    source: "YOUTUBE",
    url: "https://youtube.com/watch?v=abc123",
    thumbnailUrl: "https://img.youtube.com/vi/abc123/hqdefault.jpg",
    title: "Sample Video Title",
    description: "A sample description",
    embedUrl: "https://www.youtube.com/embed/abc123",
    embedWidth: 560,
    embedHeight: 315,
    addedBy: {
      id: 1,
      displayName: "Alice",
      username: "alice",
    },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: null,
    ...overrides,
  } as GameMediaNode;
}

// ---- Helpers ----

interface RenderProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onMediaAdded?: (media: GameMediaNode) => void;
}

function renderDialog(props: RenderProps = {}) {
  const onOpenChange = props.onOpenChange ?? vi.fn();
  const onMediaAdded = props.onMediaAdded ?? vi.fn();
  const open = props.open ?? true;

  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AddLinkDialog
        gameId={42}
        open={open}
        onOpenChange={onOpenChange}
        onMediaAdded={onMediaAdded}
      />
    </NextIntlClientProvider>,
  );
}

// ---- Tests ----

describe("AddLinkDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders URL input and Preview button when open", () => {
    renderDialog();

    expect(screen.getByLabelText(/URL/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /preview/i }),
    ).toBeInTheDocument();
  });

  it("does not render dialog content when closed", () => {
    renderDialog({ open: false });

    expect(screen.queryByLabelText(/URL/i)).not.toBeInTheDocument();
  });

  it("shows Zod validation error for invalid URL after blur", async () => {
    renderDialog();

    const input = screen.getByLabelText(/URL/i);
    fireEvent.change(input, { target: { value: "not-a-url" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("calls resolveUrl on Preview click with valid URL", async () => {
    const { resolveUrl } = await import("@/app/[locale]/game/media-actions");
    vi.mocked(resolveUrl).mockResolvedValue({ success: false, message: "err" });

    renderDialog();

    const input = screen.getByLabelText(/URL/i);
    fireEvent.change(input, {
      target: { value: "https://youtube.com/watch?v=abc123" },
    });

    const previewBtn = screen.getByRole("button", { name: /preview/i });
    fireEvent.click(previewBtn);

    await waitFor(() => {
      expect(resolveUrl).toHaveBeenCalledWith(
        "https://youtube.com/watch?v=abc123",
        42,
      );
    });
  });

  it("renders preview card after successful resolve", async () => {
    const { resolveUrl } = await import("@/app/[locale]/game/media-actions");
    vi.mocked(resolveUrl).mockResolvedValue({
      success: true,
      data: makePreview(),
    });

    renderDialog();

    const input = screen.getByLabelText(/URL/i);
    fireEvent.change(input, {
      target: { value: "https://youtube.com/watch?v=abc123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /preview/i }));

    await waitFor(() => {
      expect(screen.getByText("Sample Video Title")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
  });

  it("shows inline error when resolveUrl returns DuplicateMediaError", async () => {
    const { resolveUrl } = await import("@/app/[locale]/game/media-actions");
    vi.mocked(resolveUrl).mockResolvedValue({
      success: false,
      errorType: "DuplicateMediaError",
      message: "Already exists",
    });

    renderDialog();

    const input = screen.getByLabelText(/URL/i);
    fireEvent.change(input, {
      target: { value: "https://youtube.com/watch?v=abc123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /preview/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("calls addGameMediaLink on Add click", async () => {
    const { resolveUrl, addGameMediaLink } = await import(
      "@/app/[locale]/game/media-actions"
    );
    vi.mocked(resolveUrl).mockResolvedValue({
      success: true,
      data: makePreview(),
    });
    vi.mocked(addGameMediaLink).mockResolvedValue({
      success: false,
      message: "err",
    });

    renderDialog();

    const input = screen.getByLabelText(/URL/i);
    fireEvent.change(input, {
      target: { value: "https://youtube.com/watch?v=abc123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /preview/i }));

    await waitFor(() =>
      expect(screen.getByText("Sample Video Title")).toBeInTheDocument(),
    );

    const addButton = screen.getByRole("button", { name: /add/i });
    await waitFor(() => expect(addButton).toBeEnabled());
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(addGameMediaLink).toHaveBeenCalledWith(
        "https://youtube.com/watch?v=abc123",
        42,
      );
    });
  });

  it("closes dialog and fires onMediaAdded on successful add", async () => {
    const { resolveUrl } = await import("@/app/[locale]/game/media-actions");
    const { addGameMediaLink } = await import(
      "@/app/[locale]/game/media-actions"
    );
    const { toast } = await import("sonner");
    const onOpenChange = vi.fn();
    const onMediaAdded = vi.fn();
    const media = makeGameMedia();

    vi.mocked(resolveUrl).mockResolvedValue({
      success: true,
      data: makePreview(),
    });
    vi.mocked(addGameMediaLink).mockResolvedValue({
      success: true,
      gameMedia: media,
    });

    renderDialog({ onOpenChange, onMediaAdded });

    const input = screen.getByLabelText(/URL/i);
    fireEvent.change(input, {
      target: { value: "https://youtube.com/watch?v=abc123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /preview/i }));

    await waitFor(() =>
      expect(screen.getByText("Sample Video Title")).toBeInTheDocument(),
    );

    const addButton = screen.getByRole("button", { name: /add/i });
    await waitFor(() => expect(addButton).toBeEnabled());
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(onMediaAdded).toHaveBeenCalledWith(media);
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("resets state when dialog closes", async () => {
    const { resolveUrl } = await import("@/app/[locale]/game/media-actions");
    vi.mocked(resolveUrl).mockResolvedValue({
      success: true,
      data: makePreview(),
    });

    const onOpenChange = vi.fn();
    const { rerender } = renderDialog({ onOpenChange });

    const input = screen.getByLabelText(/URL/i);
    fireEvent.change(input, {
      target: { value: "https://youtube.com/watch?v=abc123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /preview/i }));

    await waitFor(() =>
      expect(screen.getByText("Sample Video Title")).toBeInTheDocument(),
    );

    // Wait for transition to settle before clicking Cancel
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await waitFor(() => expect(cancelButton).toBeEnabled());
    fireEvent.click(cancelButton);
    expect(onOpenChange).toHaveBeenCalledWith(false);

    // Rerender as closed then open again to check state reset
    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <AddLinkDialog
          gameId={42}
          open={false}
          onOpenChange={onOpenChange}
          onMediaAdded={vi.fn()}
        />
      </NextIntlClientProvider>,
    );

    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <AddLinkDialog
          gameId={42}
          open={true}
          onOpenChange={onOpenChange}
          onMediaAdded={vi.fn()}
        />
      </NextIntlClientProvider>,
    );

    // Preview should not be present after re-open
    expect(screen.queryByText("Sample Video Title")).not.toBeInTheDocument();
    // URL input should be empty
    expect(screen.getByLabelText(/URL/i)).toHaveValue("");
  });
});
