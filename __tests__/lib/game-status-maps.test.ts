import { describe, expect, it } from "vitest";
import {
  GameStatus,
  GameStatusAriaLabelKey,
  GameStatusBadgeVariant,
  GameStatusLabelKey,
} from "@/lib/constants";
import { snakeToCamel } from "@/lib/utils";
import messages from "../../messages/en.json";

function resolve(path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, key) => (node as Record<string, unknown> | undefined)?.[key],
      messages,
    );
}

describe("GameStatus", () => {
  it("lists every backend status in order", () => {
    expect(Object.values(GameStatus)).toEqual([
      "SCHEDULED",
      "IN_PROGRESS",
      "COMPLETE",
      "FINALIZED",
      "CANCELLED",
      "FORFEITED",
    ]);
  });

  describe.each(Object.values(GameStatus))("%s", (status) => {
    it("has a badge variant", () => {
      expect(GameStatusBadgeVariant[status]).toBeDefined();
    });

    it("has label and aria keys that resolve to messages", () => {
      expect(typeof resolve(GameStatusLabelKey[status])).toBe("string");
      expect(typeof resolve(GameStatusAriaLabelKey[status])).toBe("string");
    });

    it("has a filter label under game.status", () => {
      expect(
        typeof resolve(`game.status.${snakeToCamel(status.toLowerCase())}`),
      ).toBe("string");
    });
  });
});
