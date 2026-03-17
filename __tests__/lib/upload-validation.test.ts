import { describe, it, expect } from "vitest";
import {
  isImageMimeType,
  isVideoMimeType,
  validateFile,
  formatFileSize,
  getMaxSizeLabel,
  getAcceptAttribute,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
} from "@/lib/upload-validation";

describe("isImageMimeType", () => {
  it("returns true for valid image types", () => {
    expect(isImageMimeType("image/jpeg")).toBe(true);
    expect(isImageMimeType("image/png")).toBe(true);
    expect(isImageMimeType("image/webp")).toBe(true);
    expect(isImageMimeType("image/gif")).toBe(true);
  });

  it("returns false for non-image types", () => {
    expect(isImageMimeType("video/mp4")).toBe(false);
    expect(isImageMimeType("text/plain")).toBe(false);
    expect(isImageMimeType("")).toBe(false);
  });
});

describe("isVideoMimeType", () => {
  it("returns true for valid video types", () => {
    expect(isVideoMimeType("video/mp4")).toBe(true);
    expect(isVideoMimeType("video/quicktime")).toBe(true);
    expect(isVideoMimeType("video/webm")).toBe(true);
  });

  it("returns false for non-video types", () => {
    expect(isVideoMimeType("image/jpeg")).toBe(false);
    expect(isVideoMimeType("")).toBe(false);
  });
});

function makeFile(type: string, size: number): File {
  const file = new File(["x"], "test", { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("validateFile", () => {
  it("accepts valid image under size limit", () => {
    expect(validateFile(makeFile("image/jpeg", 1024), "profilePicture")).toEqual({ valid: true });
  });

  it("rejects invalid MIME type", () => {
    expect(validateFile(makeFile("text/plain", 1024), "profilePicture")).toEqual({
      valid: false,
      error: "invalidType",
    });
  });

  it("rejects image exceeding size limit", () => {
    expect(validateFile(makeFile("image/jpeg", MAX_IMAGE_SIZE + 1), "profilePicture")).toEqual({
      valid: false,
      error: "fileTooLarge",
    });
  });

  it("accepts video for gameMedia context", () => {
    expect(validateFile(makeFile("video/mp4", 1024), "gameMedia")).toEqual({ valid: true });
  });

  it("rejects video exceeding video size limit", () => {
    expect(validateFile(makeFile("video/mp4", MAX_VIDEO_SIZE + 1), "gameMedia")).toEqual({
      valid: false,
      error: "fileTooLarge",
    });
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.0 GB");
  });
});

describe("getMaxSizeLabel", () => {
  it("returns 10 MB for image types", () => {
    expect(getMaxSizeLabel("image/jpeg")).toBe("10 MB");
  });

  it("returns 100 MB for video types", () => {
    expect(getMaxSizeLabel("video/mp4")).toBe("100 MB");
  });
});

describe("getAcceptAttribute", () => {
  it("returns image types only for profilePicture", () => {
    const result = getAcceptAttribute("profilePicture");
    expect(result).toContain("image/jpeg");
    expect(result).not.toContain("video/mp4");
  });

  it("returns all media types for gameMedia", () => {
    const result = getAcceptAttribute("gameMedia");
    expect(result).toContain("image/jpeg");
    expect(result).toContain("video/mp4");
  });

  it("returns all media types for chatMedia", () => {
    const result = getAcceptAttribute("chatMedia");
    expect(result).toContain("image/jpeg");
    expect(result).toContain("video/mp4");
  });
});
