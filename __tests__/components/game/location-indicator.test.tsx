import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) => {
    const translations: Record<string, string> = {
      "game.discover.gamesNear": `Games near ${values?.location ?? ""}`,
      "game.discover.gamesEverywhere": "Games everywhere",
      "game.discover.changeLocation": "Change",
      "game.discover.setLocation": "Set location",
      "game.discover.detectingLocation": "Finding your location\u2026",
    };
    return translations[key] ?? key;
  },
}));

import { LocationIndicator } from "@/components/game/location-indicator";

describe("LocationIndicator", () => {
  it("shows location name when location is active", () => {
    render(
      <LocationIndicator
        locationName="Austin, TX"
        isDetecting={false}
        onChangeClick={() => {}}
      />,
    );
    expect(screen.getByText("Games near Austin, TX")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change" })).toBeInTheDocument();
  });

  it("shows 'Games everywhere' when no location", () => {
    render(
      <LocationIndicator
        locationName={null}
        isDetecting={false}
        onChangeClick={() => {}}
      />,
    );
    expect(screen.getByText("Games everywhere")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Set location" }),
    ).toBeInTheDocument();
  });

  it("shows detecting state", () => {
    render(
      <LocationIndicator
        locationName={null}
        isDetecting={true}
        onChangeClick={() => {}}
      />,
    );
    expect(screen.getByText("Finding your location\u2026")).toBeInTheDocument();
  });
});
