import { describe, it, expect } from "vitest";
import { isGameStatus } from "@/lib/constants";

describe("isGameStatus", () => {
  it("accepts every real status", () => {
    expect(isGameStatus("FINALIZED")).toBe(true);
    expect(isGameStatus("SCHEDULED")).toBe(true);
  });

  it("rejects non-statuses", () => {
    expect(isGameStatus("END_DATE")).toBe(false);
    expect(isGameStatus(undefined)).toBe(false);
    expect(isGameStatus("constructor")).toBe(false);
  });
});
