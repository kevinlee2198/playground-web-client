import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { EmbedPlayer } from "@/components/game/embed-player";
import { GameVisibility } from "@/lib/constants";
import messages from "../../../messages/en.json";

function renderEmbedPlayer(props: Partial<Parameters<typeof EmbedPlayer>[0]> = {}) {
  const defaults = {
    embedUrl: "https://www.youtube-nocookie.com/embed/abc123",
    thumbnailUrl: "https://example.com/thumb.jpg",
    title: "Test Video",
    source: "YOUTUBE" as const,
    autoLoad: false,
    gameVisibility: GameVisibility.PUBLIC,
  };

  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <EmbedPlayer {...defaults} {...props} />
    </NextIntlClientProvider>,
  );
}

describe("EmbedPlayer", () => {
  it("shows thumbnail and play button when autoLoad is false", () => {
    renderEmbedPlayer({ autoLoad: false });

    expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
    expect(screen.queryByTitle(/video/i)).not.toBeInTheDocument();
  });

  it("loads iframe on click", () => {
    renderEmbedPlayer({ autoLoad: false });

    const playButton = screen.getByRole("button", { name: /play/i });
    fireEvent.click(playButton);

    expect(screen.getByTitle("Test Video")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /play/i })).not.toBeInTheDocument();
  });

  it("auto-loads iframe when autoLoad is true", () => {
    renderEmbedPlayer({ autoLoad: true, title: "Auto Video" });

    expect(screen.getByTitle("Auto Video")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /play/i })).not.toBeInTheDocument();
  });

  it("shows privacy disclosure for PRIVATE games", () => {
    renderEmbedPlayer({
      autoLoad: false,
      gameVisibility: GameVisibility.PRIVATE,
      source: "YOUTUBE",
    });

    expect(screen.getByText(/Loading this video will share data with YOUTUBE/)).toBeInTheDocument();
  });

  it("does not show privacy disclosure for PUBLIC games", () => {
    renderEmbedPlayer({
      autoLoad: false,
      gameVisibility: GameVisibility.PUBLIC,
      source: "YOUTUBE",
    });

    expect(screen.queryByText(/Loading this video will share data/)).not.toBeInTheDocument();
  });

  it("uses portrait aspect ratio class for TikTok source", () => {
    const { container } = renderEmbedPlayer({
      autoLoad: false,
      source: "TIKTOK",
    });

    const aspectDiv = container.querySelector(".aspect-\\[9\\/16\\]");
    expect(aspectDiv).toBeInTheDocument();
  });
});
