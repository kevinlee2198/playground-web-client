import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SportIcon } from "@/components/game/sport-icon";
import { SportType } from "@/lib/constants";

describe("SportIcon", () => {
  it("renders an SVG with aria-hidden for basketball", () => {
    const { container } = render(
      <SportIcon sportType={SportType.BASKETBALL} />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
  });

  it("renders correct default size (md = 18px)", () => {
    const { container } = render(
      <SportIcon sportType={SportType.TENNIS} />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "18");
    expect(svg).toHaveAttribute("height", "18");
  });

  it("renders sm size (14px)", () => {
    const { container } = render(
      <SportIcon sportType={SportType.FOOTBALL} size="sm" />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "14");
    expect(svg).toHaveAttribute("height", "14");
  });

  it("renders lg size (24px)", () => {
    const { container } = render(
      <SportIcon sportType={SportType.BASEBALL} size="lg" />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "24");
    expect(svg).toHaveAttribute("height", "24");
  });

  it("renders SVG paths for each sport type", () => {
    for (const sport of Object.values(SportType)) {
      const { container, unmount } = render(<SportIcon sportType={sport} />);
      const svg = container.querySelector("svg");
      expect(svg?.children.length).toBeGreaterThan(0);
      unmount();
    }
  });

  it("applies custom className to the SVG", () => {
    const { container } = render(
      <SportIcon sportType={SportType.PICKLEBALL} className="text-red-500" />,
    );
    const svg = container.querySelector("svg");
    expect(svg?.className.baseVal).toContain("text-red-500");
  });

  it("uses currentColor for stroke", () => {
    const { container } = render(
      <SportIcon sportType={SportType.BASKETBALL} />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("stroke", "currentColor");
  });
});
