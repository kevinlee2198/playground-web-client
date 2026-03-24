import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { LinkCardMediaItem } from "@/components/game/link-card-media-item";
import type { LinkMediaNode } from "@/lib/types/game-media";
import messages from "../../../messages/en.json";

function makeLinkMedia(overrides: Partial<LinkMediaNode> = {}): LinkMediaNode {
  return {
    __typename: "LinkMedia",
    id: "media-1",
    source: "CUSTOM_URL",
    url: "https://example.com/article",
    thumbnailUrl: "https://example.com/thumb.jpg",
    title: "Test Article Title",
    description: "A short description of the article.",
    addedBy: {
      id: "user-1",
      displayName: "Alice",
      username: "alice",
    },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: null,
    ...overrides,
  };
}

function renderLinkCard(
  mediaOverrides: Partial<LinkMediaNode> = {},
  props: { canDelete?: boolean; onDelete?: (id: string) => void } = {},
) {
  const onDelete = props.onDelete ?? vi.fn();
  const canDelete = props.canDelete ?? true;

  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <LinkCardMediaItem
        media={makeLinkMedia(mediaOverrides)}
        canDelete={canDelete}
        onDelete={onDelete}
      />
    </NextIntlClientProvider>,
  );
}

describe("LinkCardMediaItem", () => {
  it("renders title and description", () => {
    renderLinkCard();

    expect(screen.getByText("Test Article Title")).toBeInTheDocument();
    expect(screen.getByText("A short description of the article.")).toBeInTheDocument();
  });

  it("opens URL in a new tab", () => {
    renderLinkCard();

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://example.com/article");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows delete button when canDelete is true", () => {
    renderLinkCard({}, { canDelete: true });

    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("hides delete button when canDelete is false", () => {
    renderLinkCard({}, { canDelete: false });

    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("calls onDelete with media id when delete button is clicked", () => {
    const onDelete = vi.fn();
    renderLinkCard({}, { canDelete: true, onDelete });

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(onDelete).toHaveBeenCalledWith("media-1");
  });

  it("shows placeholder icon when thumbnailUrl is null", () => {
    const { container } = renderLinkCard({ thumbnailUrl: null });

    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });
});
