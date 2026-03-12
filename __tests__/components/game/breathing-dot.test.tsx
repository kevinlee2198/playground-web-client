import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BreathingDot } from "@/components/game/breathing-dot";

describe("BreathingDot", () => {
  it("renders a dot with aria-hidden", () => {
    render(<BreathingDot />);
    const dot = screen.getByTestId("breathing-dot");
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });

  it("has the animate-breathe class", () => {
    render(<BreathingDot />);
    const dot = screen.getByTestId("breathing-dot");
    expect(dot.className).toContain("animate-breathe");
  });

  it("applies reduced motion styles", () => {
    render(<BreathingDot />);
    const dot = screen.getByTestId("breathing-dot");
    expect(dot.className).toContain("motion-reduce:animate-none");
  });

  it("accepts custom className", () => {
    render(<BreathingDot className="ml-2" />);
    const dot = screen.getByTestId("breathing-dot");
    expect(dot.className).toContain("ml-2");
  });
});
