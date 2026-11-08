import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { uploadToS3 } from "@/lib/s3-upload";

const uploadHeaders = [
  { name: "content-type", value: "image/jpeg" },
  { name: "if-none-match", value: "*" },
];

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("uploadToS3", () => {
  it("sends uploadHeaders verbatim and nothing from file.type", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    const file = new File(["x"], "photo.jpg", { type: "image/jpg" });

    const result = await uploadToS3(file, "https://s3.example.com/put", uploadHeaders);

    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledWith("https://s3.example.com/put", {
      method: "PUT",
      body: file,
      headers: { "content-type": "image/jpeg", "if-none-match": "*" },
    });
  });

  it("treats 412 as uploaded", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 412 });
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });

    expect(await uploadToS3(file, "https://s3.example.com/put", uploadHeaders)).toEqual({
      success: true,
    });
  });

  it("fails on 403", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });

    expect(await uploadToS3(file, "https://s3.example.com/put", uploadHeaders)).toEqual({
      success: false,
    });
  });

  it("fails when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });

    expect(await uploadToS3(file, "https://s3.example.com/put", uploadHeaders)).toEqual({
      success: false,
    });
  });
});
