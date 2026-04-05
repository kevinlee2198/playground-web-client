import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "sports.BASKETBALL": "Basketball",
      "sports.TENNIS": "Tennis",
      "sports.FOOTBALL": "Football",
      "sports.PICKLEBALL": "Pickleball",
      "sports.BASEBALL": "Baseball",
      "sports.VOLLEYBALL": "Volleyball",
    };
    return map[key] ?? key;
  },
}));

import { SportBadge } from "@/components/game/sport-badge";
import { SportType } from "@/lib/constants";

describe("SportBadge", () => {
  it("renders with aria-label for each sport type", () => {
    const expected: Record<string, string> = {
      BASKETBALL: "Basketball",
      TENNIS: "Tennis",
      FOOTBALL: "Football",
      PICKLEBALL: "Pickleball",
      BASEBALL: "Baseball",
      VOLLEYBALL: "Volleyball",
    };
    for (const sport of Object.values(SportType)) {
      const { unmount } = render(<SportBadge sportType={sport} />);
      expect(screen.getByLabelText(expected[sport])).toBeInTheDocument();
      unmount();
    }
  });

  it("applies sport-specific background class", () => {
    render(<SportBadge sportType={SportType.BASKETBALL} />);
    const pill = screen.getByLabelText("Basketball");
    expect(pill.className).toContain("bg-sport-basketball");
  });

  it("contains an SVG icon", () => {
    const { container } = render(
      <SportBadge sportType={SportType.TENNIS} />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("does not show label text by default", () => {
    render(<SportBadge sportType={SportType.BASKETBALL} />);
    expect(screen.queryByText("Basketball")).not.toBeInTheDocument();
  });

  it("shows label text when showLabel is true", () => {
    render(<SportBadge sportType={SportType.BASKETBALL} showLabel />);
    expect(screen.getByText("Basketball")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <SportBadge sportType={SportType.FOOTBALL} className="my-custom" />,
    );
    const pill = screen.getByLabelText("Football");
    expect(pill.className).toContain("my-custom");
  });
});
