import { describe, expect, it } from "vitest";
import {
  isEmbeddable,
  TRUSTED_EMBED_DOMAINS,
} from "@/lib/embed-config";

describe("TRUSTED_EMBED_DOMAINS", () => {
  it("includes all expected provider domains", () => {
    expect(TRUSTED_EMBED_DOMAINS).toContain("www.youtube-nocookie.com");
    expect(TRUSTED_EMBED_DOMAINS).toContain("player.vimeo.com");
    expect(TRUSTED_EMBED_DOMAINS).toContain("www.tiktok.com");
    expect(TRUSTED_EMBED_DOMAINS).toContain("player.twitch.tv");
    expect(TRUSTED_EMBED_DOMAINS).toContain("www.instagram.com");
  });
});

describe("isEmbeddable", () => {
  it("returns true for YouTube nocookie domain", () => {
    expect(
      isEmbeddable("https://www.youtube-nocookie.com/embed/abc123"),
    ).toBe(true);
  });

  it("returns true for Vimeo player domain", () => {
    expect(isEmbeddable("https://player.vimeo.com/video/123456")).toBe(true);
  });

  it("returns true for TikTok domain", () => {
    expect(isEmbeddable("https://www.tiktok.com/embed/v2/123456")).toBe(true);
  });

  it("returns true for Twitch player domain", () => {
    expect(
      isEmbeddable("https://player.twitch.tv/?channel=example"),
    ).toBe(true);
  });

  it("returns true for Instagram domain", () => {
    expect(
      isEmbeddable("https://www.instagram.com/p/abc123/embed/"),
    ).toBe(true);
  });

  it("returns false for an untrusted domain", () => {
    expect(isEmbeddable("https://example.com/embed/video")).toBe(false);
  });

  it("returns false for youtube.com (wrong subdomain — must be www.youtube-nocookie.com)", () => {
    expect(isEmbeddable("https://youtube.com/embed/abc123")).toBe(false);
  });

  it("returns false for www.youtube.com (not the nocookie variant)", () => {
    expect(isEmbeddable("https://www.youtube.com/embed/abc123")).toBe(false);
  });

  it("returns false for an invalid URL", () => {
    expect(isEmbeddable("not-a-url")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isEmbeddable("")).toBe(false);
  });
});
