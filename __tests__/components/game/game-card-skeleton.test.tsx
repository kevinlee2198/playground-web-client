import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GameCardSkeleton } from "@/components/game/game-card-skeleton";

describe("GameCardSkeleton", () => {
  it("renders the skeleton container", () => {
    render(<GameCardSkeleton />);
    const skeleton = screen.getByTestId("game-card-skeleton");
    expect(skeleton).toBeInTheDocument();
  });

  it("contains skeleton elements for accent strip, sport info, score block, and meta", () => {
    const { container } = render(<GameCardSkeleton />);
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    // accent strip (1), sport info row (2), score block (5), meta row (2) = 10
    expect(skeletons.length).toBeGreaterThanOrEqual(10);
  });
});
