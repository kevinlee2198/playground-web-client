import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { LiveStreamSection } from "@/components/game/live-stream-section";
import { GameVisibility } from "@/lib/constants";
import type { LivestreamMediaNode } from "@/lib/types/game-media";
import messages from "../../../messages/en.json";

function makeLivestream(overrides: Partial<LivestreamMediaNode> = {}): LivestreamMediaNode {
  return {
    __typename: "LivestreamMedia",
    id: "media-live-1",
    source: "TWITCH",
    url: "https://www.twitch.tv/somestreamer",
    embedUrl: "https://player.twitch.tv/?channel=somestreamer",
    thumbnailUrl: null,
    title: "Championship Game Live",
    description: null,
    embedWidth: 560,
    embedHeight: 315,
    addedBy: {
      id: 42,
      displayName: "Bob",
      username: "bob",
    },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: null,
    ...overrides,
  };
}

function renderLiveStream(
  mediaOverrides: Partial<LivestreamMediaNode> = {},
  gameVisibility: GameVisibility = GameVisibility.PUBLIC,
) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <LiveStreamSection
        media={makeLivestream(mediaOverrides)}
        gameVisibility={gameVisibility}
      />
    </NextIntlClientProvider>,
  );
}

describe("LiveStreamSection", () => {
  it("renders LIVE badge with BreathingDot", () => {
    renderLiveStream();

    expect(screen.getByTestId("breathing-dot")).toBeInTheDocument();
    expect(screen.getByText("LIVE")).toBeInTheDocument();
  });

  it("shows stream title", () => {
    renderLiveStream({ title: "Championship Game Live" });

    expect(screen.getByText("Championship Game Live")).toBeInTheDocument();
  });

  it("shows added by username", () => {
    renderLiveStream({ addedBy: { id: 1, displayName: "Bob", username: "bob" } });

    expect(screen.getByText(/Added by @bob/)).toBeInTheDocument();
  });

  it("has max-w-3xl container", () => {
    const { container } = renderLiveStream();

    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("max-w-3xl");
  });
});
