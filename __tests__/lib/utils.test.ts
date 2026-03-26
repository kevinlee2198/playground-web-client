import { describe, it, expect } from "vitest";
import { getInitials, getFullName } from "@/lib/utils";

// ---------------------------------------------------------------------------
// getInitials
// ---------------------------------------------------------------------------

describe("getInitials", () => {
  it("returns first chars of firstName and lastName uppercased when both present", () => {
    expect(getInitials({ firstName: "John", lastName: "Doe", displayName: "jd" })).toBe("JD");
  });

  it("falls back to displayName substring when firstName is null", () => {
    expect(getInitials({ firstName: null, lastName: "Doe", displayName: "JohnDoe" })).toBe("JO");
  });

  it("falls back to displayName substring when lastName is null", () => {
    expect(getInitials({ firstName: "John", lastName: null, displayName: "JohnDoe" })).toBe("JO");
  });

  it("falls back to displayName substring when both are null", () => {
    expect(getInitials({ firstName: null, lastName: null, displayName: "Alice" })).toBe("AL");
  });

  it("trims whitespace from firstName and lastName", () => {
    expect(getInitials({ firstName: "  John", lastName: "Doe  ", displayName: "jd" })).toBe("JD");
  });

  it("returns '?' when displayName is empty string", () => {
    expect(getInitials({ firstName: null, lastName: null, displayName: "" })).toBe("?");
  });

  it("returns '?' when displayName is only whitespace", () => {
    expect(getInitials({ firstName: null, lastName: null, displayName: "   " })).toBe("?");
  });

  it("returns that char uppercased for a single-character displayName", () => {
    expect(getInitials({ firstName: null, lastName: null, displayName: "a" })).toBe("A");
  });

  it("lowercased initials are returned uppercased", () => {
    expect(getInitials({ firstName: "jane", lastName: "smith", displayName: "js" })).toBe("JS");
  });
});

// ---------------------------------------------------------------------------
// getFullName
// ---------------------------------------------------------------------------

describe("getFullName", () => {
  it("returns 'firstName lastName' when both are present", () => {
    expect(getFullName({ firstName: "John", lastName: "Doe", displayName: "jd" })).toBe("John Doe");
  });

  it("falls back to displayName when firstName is null", () => {
    expect(getFullName({ firstName: null, lastName: "Doe", displayName: "JohnDoe" })).toBe("JohnDoe");
  });

  it("falls back to displayName when lastName is null", () => {
    expect(getFullName({ firstName: "John", lastName: null, displayName: "JohnDoe" })).toBe("JohnDoe");
  });

  it("falls back to displayName when both are null", () => {
    expect(getFullName({ firstName: null, lastName: null, displayName: "Alice" })).toBe("Alice");
  });

  it("trims whitespace from firstName and lastName", () => {
    expect(getFullName({ firstName: "  John  ", lastName: "  Doe  ", displayName: "jd" })).toBe("John Doe");
  });

  it("falls back to displayName when firstName trims to empty string", () => {
    expect(getFullName({ firstName: "   ", lastName: "Doe", displayName: "FallbackName" })).toBe("FallbackName");
  });

  it("falls back to displayName when lastName trims to empty string", () => {
    expect(getFullName({ firstName: "John", lastName: "   ", displayName: "FallbackName" })).toBe("FallbackName");
  });
});
