import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { GameMediaItem } from "@/components/game/game-media-item";
import type {
  ImageMediaNode,
  VideoMediaNode,
  LinkMediaNode,
} from "@/lib/types/game-media";
import { GameVisibility } from "@/lib/constants";
import messages from "../../../messages/en.json";

// ---- Factories ----

function createImageMedia(overrides: Partial<ImageMediaNode> = {}): ImageMediaNode {
  return {
    __typename: "ImageMedia",
    id: "img-1",
    source: "UPLOAD",
    url: "https://s3.example.com/photo.jpg",
    thumbnailUrl: "https://s3.example.com/thumb.jpg",
    title: "Game photo",
    addedBy: { id: 1, displayName: "Test User", username: "testuser" },
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: null,
    ...overrides,
  };
}

function createUploadVideoMedia(overrides: Partial<VideoMediaNode> = {}): VideoMediaNode {
  return {
    __typename: "VideoMedia",
    id: "vid-1",
    source: "UPLOAD",
    url: "https://s3.example.com/video.mp4",
    thumbnailUrl: null,
    title: "Game video",
    description: null,
    embedUrl: null,
    embedWidth: null,
    embedHeight: null,
    addedBy: { id: 1, displayName: "Test User", username: "testuser" },
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: null,
    ...overrides,
  };
}

function createEmbeddableVideoMedia(overrides: Partial<VideoMediaNode> = {}): VideoMediaNode {
  return {
    __typename: "VideoMedia",
    id: "vid-2",
    source: "YOUTUBE",
    url: "https://www.youtube.com/watch?v=abc123",
    thumbnailUrl: "https://img.youtube.com/vi/abc123/hqdefault.jpg",
    title: "YouTube video",
    description: null,
    embedUrl: "https://www.youtube-nocookie.com/embed/abc123",
    embedWidth: 560,
    embedHeight: 315,
    addedBy: { id: 1, displayName: "Test User", username: "testuser" },
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: null,
    ...overrides,
  };
}

function createNonEmbeddableVideoMedia(overrides: Partial<VideoMediaNode> = {}): VideoMediaNode {
  return {
    __typename: "VideoMedia",
    id: "vid-3",
    source: "HUDL",
    url: "https://www.hudl.com/video/3/12345/abc123",
    thumbnailUrl: "https://www.hudl.com/thumb.jpg",
    title: "Hudl video",
    description: null,
    embedUrl: "https://www.hudl.com/embed/video/3/12345/abc123",
    embedWidth: null,
    embedHeight: null,
    addedBy: { id: 1, displayName: "Test User", username: "testuser" },
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: null,
    ...overrides,
  };
}

function createLinkMedia(overrides: Partial<LinkMediaNode> = {}): LinkMediaNode {
  return {
    __typename: "LinkMedia",
    id: "link-1",
    source: "CUSTOM_URL",
    url: "https://example.com/article",
    thumbnailUrl: "https://example.com/og-image.jpg",
    title: "Interesting article",
    description: null,
    addedBy: { id: 1, displayName: "Test User", username: "testuser" },
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: null,
    ...overrides,
  };
}

// ---- Helpers ----

interface RenderProps {
  media: Parameters<typeof GameMediaItem>[0]["media"];
  canDelete?: boolean;
  gameVisibility?: GameVisibility;
  onDelete?: (mediaId: string) => void;
}

function renderItem({
  media,
  canDelete = false,
  gameVisibility = GameVisibility.PUBLIC,
  onDelete = vi.fn(),
}: RenderProps) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <GameMediaItem
        media={media}
        canDelete={canDelete}
        gameVisibility={gameVisibility}
        onDelete={onDelete}
      />
    </NextIntlClientProvider>,
  );
}

// ---- Tests ----

describe("GameMediaItem", () => {
  describe("ImageMedia branch", () => {
    it("renders the thumbnail image", () => {
      renderItem({ media: createImageMedia() });

      const img = screen.getByRole("img", { name: "Game photo" });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://s3.example.com/thumb.jpg");
    });

    it("falls back to url when thumbnailUrl is null", () => {
      const media = createImageMedia({ thumbnailUrl: null });
      renderItem({ media });

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "https://s3.example.com/photo.jpg");
    });

    it("wraps the image in a link that opens in a new tab", () => {
      renderItem({ media: createImageMedia() });

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "https://s3.example.com/photo.jpg");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("VideoMedia with source UPLOAD (no embedUrl)", () => {
    it("shows a play button before interaction", () => {
      renderItem({ media: createUploadVideoMedia() });

      expect(screen.getByRole("button", { name: /play game video/i })).toBeInTheDocument();
    });

    it("renders Film icon placeholder when thumbnailUrl is null", () => {
      const { container } = renderItem({ media: createUploadVideoMedia({ thumbnailUrl: null }) });

      // Film and Play SVG icons should be present in the DOM
      const svgs = container.querySelectorAll("svg");
      // Play icon inside the button + Film icon + Trash2 is hidden — 2 svgs minimum
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    });

    it("renders thumbnail image when thumbnailUrl is provided", () => {
      const media = createUploadVideoMedia({ thumbnailUrl: "https://s3.example.com/vthumb.jpg" });
      renderItem({ media });

      const img = screen.getByRole("img", { name: "Game video" });
      expect(img).toHaveAttribute("src", "https://s3.example.com/vthumb.jpg");
    });

    it("shows native video element after clicking play", () => {
      renderItem({ media: createUploadVideoMedia() });

      const playButton = screen.getByRole("button", { name: /play/i });
      fireEvent.click(playButton);

      expect(document.querySelector("video")).toBeInTheDocument();
      expect(document.querySelector("video")).toHaveAttribute(
        "src",
        "https://s3.example.com/video.mp4",
      );
    });

    it("hides the play button after clicking play", () => {
      renderItem({ media: createUploadVideoMedia() });

      const playButton = screen.getByRole("button", { name: /play/i });
      fireEvent.click(playButton);

      expect(screen.queryByRole("button", { name: /play/i })).not.toBeInTheDocument();
    });
  });

  describe("VideoMedia with embeddable embedUrl (youtube-nocookie.com)", () => {
    it("shows a play button before interaction", () => {
      renderItem({ media: createEmbeddableVideoMedia() });

      expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
    });

    it("renders EmbedPlayer iframe after clicking play twice", () => {
      // First click swaps in EmbedPlayer (autoLoad=false), which shows its own play button.
      // Second click on EmbedPlayer's play button loads the iframe.
      renderItem({ media: createEmbeddableVideoMedia() });

      // Click the outer VideoMediaItem play button → EmbedPlayer mounts
      const outerPlay = screen.getByRole("button", { name: /play/i });
      fireEvent.click(outerPlay);

      // EmbedPlayer is now rendered (autoLoad=false) — click its play button
      const embedPlay = screen.getByRole("button", { name: /play/i });
      fireEvent.click(embedPlay);

      // Now EmbedPlayer renders the iframe
      const iframe = document.querySelector("iframe");
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute(
        "src",
        "https://www.youtube-nocookie.com/embed/abc123",
      );
    });

    it("does NOT render a native video element", () => {
      renderItem({ media: createEmbeddableVideoMedia() });

      fireEvent.click(screen.getByRole("button", { name: /play/i }));

      expect(document.querySelector("video")).not.toBeInTheDocument();
    });
  });

  describe("VideoMedia with non-embeddable embedUrl (hudl.com)", () => {
    it("renders a link card — NOT a play button", () => {
      renderItem({ media: createNonEmbeddableVideoMedia() });

      expect(screen.queryByRole("button", { name: /play/i })).not.toBeInTheDocument();
    });

    it("renders a link that opens in a new tab to the original URL", () => {
      renderItem({ media: createNonEmbeddableVideoMedia() });

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "https://www.hudl.com/video/3/12345/abc123");
      expect(link).toHaveAttribute("target", "_blank");
    });

    it("renders the thumbnail image inside the link card", () => {
      renderItem({ media: createNonEmbeddableVideoMedia() });

      const img = screen.getByRole("img", { name: "Hudl video" });
      expect(img).toHaveAttribute("src", "https://www.hudl.com/thumb.jpg");
    });

    it("renders icon + text fallback when thumbnailUrl is null", () => {
      const media = createNonEmbeddableVideoMedia({ thumbnailUrl: null });
      renderItem({ media });

      expect(screen.getByText("Hudl video")).toBeInTheDocument();
    });

    it("does NOT render an iframe", () => {
      renderItem({ media: createNonEmbeddableVideoMedia() });

      expect(document.querySelector("iframe")).not.toBeInTheDocument();
    });
  });

  describe("LinkMedia branch", () => {
    it("renders a link that opens in a new tab", () => {
      renderItem({ media: createLinkMedia() });

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "https://example.com/article");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("renders the thumbnail image when thumbnailUrl is provided", () => {
      renderItem({ media: createLinkMedia() });

      const img = screen.getByRole("img", { name: "Interesting article" });
      expect(img).toHaveAttribute("src", "https://example.com/og-image.jpg");
    });

    it("renders link icon and title text when thumbnailUrl is null", () => {
      const media = createLinkMedia({ thumbnailUrl: null });
      renderItem({ media });

      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(screen.getByText("Interesting article")).toBeInTheDocument();
    });

    it("renders URL text when both thumbnailUrl and title are null", () => {
      const media = createLinkMedia({ thumbnailUrl: null, title: null });
      renderItem({ media });

      expect(screen.getByText("https://example.com/article")).toBeInTheDocument();
    });
  });

  describe("Delete button visibility", () => {
    it("shows delete button when canDelete is true for ImageMedia", () => {
      renderItem({ media: createImageMedia(), canDelete: true });

      expect(screen.getByRole("button", { name: /delete media/i })).toBeInTheDocument();
    });

    it("hides delete button when canDelete is false for ImageMedia", () => {
      renderItem({ media: createImageMedia(), canDelete: false });

      expect(screen.queryByRole("button", { name: /delete media/i })).not.toBeInTheDocument();
    });

    it("shows delete button when canDelete is true for VideoMedia (upload)", () => {
      renderItem({ media: createUploadVideoMedia(), canDelete: true });

      expect(screen.getByRole("button", { name: /delete media/i })).toBeInTheDocument();
    });

    it("hides delete button when canDelete is false for VideoMedia (upload)", () => {
      renderItem({ media: createUploadVideoMedia(), canDelete: false });

      expect(screen.queryByRole("button", { name: /delete media/i })).not.toBeInTheDocument();
    });

    it("shows delete button when canDelete is true for non-embeddable VideoMedia (link card)", () => {
      renderItem({ media: createNonEmbeddableVideoMedia(), canDelete: true });

      expect(screen.getByRole("button", { name: /delete media/i })).toBeInTheDocument();
    });

    it("hides delete button when canDelete is false for non-embeddable VideoMedia (link card)", () => {
      renderItem({ media: createNonEmbeddableVideoMedia(), canDelete: false });

      expect(screen.queryByRole("button", { name: /delete media/i })).not.toBeInTheDocument();
    });

    it("shows delete button when canDelete is true for LinkMedia", () => {
      renderItem({ media: createLinkMedia(), canDelete: true });

      expect(screen.getByRole("button", { name: /delete media/i })).toBeInTheDocument();
    });

    it("hides delete button when canDelete is false for LinkMedia", () => {
      renderItem({ media: createLinkMedia(), canDelete: false });

      expect(screen.queryByRole("button", { name: /delete media/i })).not.toBeInTheDocument();
    });

    it("hides delete button for VideoMedia while playing", () => {
      renderItem({ media: createUploadVideoMedia(), canDelete: true });

      fireEvent.click(screen.getByRole("button", { name: /play/i }));

      expect(screen.queryByRole("button", { name: /delete media/i })).not.toBeInTheDocument();
    });

    it("calls onDelete with the correct media id when delete button is clicked", () => {
      const onDelete = vi.fn();
      renderItem({ media: createImageMedia({ id: "img-42" }), canDelete: true, onDelete });

      fireEvent.click(screen.getByRole("button", { name: /delete media/i }));

      expect(onDelete).toHaveBeenCalledWith("img-42");
    });

    it("calls onDelete with the correct id for LinkMedia", () => {
      const onDelete = vi.fn();
      renderItem({ media: createLinkMedia({ id: "link-99" }), canDelete: true, onDelete });

      fireEvent.click(screen.getByRole("button", { name: /delete media/i }));

      expect(onDelete).toHaveBeenCalledWith("link-99");
    });
  });
});
