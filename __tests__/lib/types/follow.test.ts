import { describe, it, expect } from "vitest";
import { isMutualFollow } from "@/lib/types/follow";

describe("isMutualFollow", () => {
  it("returns true when both follow each other", () => {
    expect(isMutualFollow({ viewerFollowsUser: true, userFollowsViewer: true })).toBe(true);
  });
  it("returns false when only viewer follows", () => {
    expect(isMutualFollow({ viewerFollowsUser: true, userFollowsViewer: false })).toBe(false);
  });
  it("returns false when only user follows viewer", () => {
    expect(isMutualFollow({ viewerFollowsUser: false, userFollowsViewer: true })).toBe(false);
  });
  it("returns false when neither follows", () => {
    expect(isMutualFollow({ viewerFollowsUser: false, userFollowsViewer: false })).toBe(false);
  });
});
