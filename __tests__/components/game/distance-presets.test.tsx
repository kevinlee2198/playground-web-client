import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (key === "game.discover.distancePresets.miles")
      return `${values?.distance} mi`;
    if (key === "game.discover.distancePresets.label") return "Distance";
    return key;
  },
}));

import { DistancePresets } from "@/components/game/distance-presets";

describe("DistancePresets", () => {
  it("renders all preset buttons", () => {
    render(<DistancePresets selected={25} onSelect={() => {}} />);
    expect(screen.getByText("5 mi")).toBeInTheDocument();
    expect(screen.getByText("10 mi")).toBeInTheDocument();
    expect(screen.getByText("25 mi")).toBeInTheDocument();
    expect(screen.getByText("50 mi")).toBeInTheDocument();
  });

  it("highlights the selected preset", () => {
    render(<DistancePresets selected={25} onSelect={() => {}} />);
    const btn25 = screen.getByText("25 mi").closest("button");
    expect(btn25).toHaveAttribute("data-selected", "true");
  });

  it("calls onSelect when a preset is clicked", () => {
    const onSelect = vi.fn();
    render(<DistancePresets selected={25} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("10 mi"));
    expect(onSelect).toHaveBeenCalledWith(10);
  });
});
