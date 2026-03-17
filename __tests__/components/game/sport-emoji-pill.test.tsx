import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "sports.BASKETBALL": "Basketball",
      "sports.TENNIS": "Tennis",
      "sports.FOOTBALL": "Football",
      "sports.PICKLEBALL": "Pickleball",
    };
    return map[key] ?? key;
  },
}));

import { SportEmojiPill } from "@/components/game/sport-emoji-pill";
import { SportType } from "@/lib/constants";

describe("SportEmojiPill", () => {
  it("renders basketball emoji with correct aria-label", () => {
    render(<SportEmojiPill sportType={SportType.BASKETBALL} />);
    const pill = screen.getByLabelText("Basketball");
    expect(pill).toBeInTheDocument();
    expect(pill.textContent).toContain("🏀");
  });

  it("renders tennis emoji with correct aria-label", () => {
    render(<SportEmojiPill sportType={SportType.TENNIS} />);
    const pill = screen.getByLabelText("Tennis");
    expect(pill).toBeInTheDocument();
    expect(pill.textContent).toContain("🎾");
  });

  it("renders football emoji with correct aria-label", () => {
    render(<SportEmojiPill sportType={SportType.FOOTBALL} />);
    const pill = screen.getByLabelText("Football");
    expect(pill).toBeInTheDocument();
    expect(pill.textContent).toContain("🏈");
  });

  it("renders pickleball emoji with correct aria-label", () => {
    render(<SportEmojiPill sportType={SportType.PICKLEBALL} />);
    const pill = screen.getByLabelText("Pickleball");
    expect(pill).toBeInTheDocument();
    expect(pill.textContent).toContain("🥒");
  });

  it("uses sport-specific background color class", () => {
    render(<SportEmojiPill sportType={SportType.BASKETBALL} />);
    const pill = screen.getByLabelText("Basketball");
    expect(pill.className).toContain("bg-sport-basketball");
  });
});
