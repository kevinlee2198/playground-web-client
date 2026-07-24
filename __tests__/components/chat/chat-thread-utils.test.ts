/**
 * Timezone is pinned to America/New_York for this whole suite via
 * `vitest.config.mts` (`test.env.TZ`) so `localDayKey`/`classifyDayLabel`
 * (which use local `Date` methods) are deterministic in CI. Fixtures below
 * are authored against that zone; dates are chosen to avoid DST transitions
 * (America/New_York DST started 2025-03-09, so March 2–3 2025 is EST/UTC-5).
 */
import { describe, it, expect } from "vitest";
import {
  buildThreadItems,
  classifyDayLabel,
  hasReconnectGap,
  localDayKey,
  reconcileMessages,
} from "@/components/chat/chat-thread-utils";
import type { Edge } from "@/lib/graphql-connection";
import type {
  ChatMessageNode,
  ChatUser,
  MemberJoinedChatMessageNode,
  TextChatMessageNode,
} from "@/lib/types/chat";

function user(id: number): ChatUser {
  return { id, firstName: null, lastName: null, displayName: `User ${id}` };
}

function textMessage(
  id: string,
  createdDate: string,
  userId: number,
  content = "hello",
): TextChatMessageNode {
  return {
    __typename: "TextChatMessage",
    id,
    createdDate,
    user: user(userId),
    updatedDate: null,
    deletedDate: null,
    replyTo: null,
    content,
  };
}

function memberJoined(
  id: string,
  createdDate: string,
  userId: number,
): MemberJoinedChatMessageNode {
  return {
    __typename: "MemberJoinedChatMessage",
    id,
    createdDate,
    member: user(userId),
  };
}

function edge(node: ChatMessageNode): Edge<ChatMessageNode> {
  return { cursor: node.id, node };
}

describe("localDayKey", () => {
  it("buckets two timestamps on the same local day into the same key", () => {
    expect(localDayKey("2025-06-15T14:00:00Z")).toBe(
      localDayKey("2025-06-15T20:00:00Z"),
    );
  });

  it("buckets timestamps across local midnight into different keys", () => {
    // 2025-06-10T23:59 local (EDT, UTC-4) and 2025-06-11T00:01 local — 2
    // minutes apart in real time, but different local calendar days.
    const before = localDayKey("2025-06-11T03:59:00Z");
    const after = localDayKey("2025-06-11T04:01:00Z");
    expect(before).not.toBe(after);
  });

  it("buckets by local day even when the UTC day differs (cross-tz fixture)", () => {
    // 2025-03-03T04:30:00Z is 2025-03-02T23:30 in America/New_York (EST).
    expect(localDayKey("2025-03-03T04:30:00Z")).toBe(localDayKey("2025-03-02T12:00:00Z"));
    expect(localDayKey("2025-03-03T04:30:00Z")).not.toBe(localDayKey("2025-03-03T12:00:00Z"));
  });
});

describe("classifyDayLabel", () => {
  const now = new Date("2025-06-15T16:00:00Z"); // 2025-06-15 12:00 local (EDT)

  it("classifies a timestamp on the same local day as today", () => {
    expect(classifyDayLabel("2025-06-15T20:00:00Z", now)).toEqual({
      kind: "today",
    });
  });

  it("classifies a timestamp on the previous local day as yesterday", () => {
    expect(classifyDayLabel("2025-06-14T20:00:00Z", now)).toEqual({
      kind: "yesterday",
    });
  });

  it("classifies an older date in the current year without the year", () => {
    // Cross-tz fixture: local day is 2025-03-02, same year as `now`.
    expect(classifyDayLabel("2025-03-03T04:30:00Z", now)).toEqual({
      kind: "date",
      withYear: false,
    });
  });

  it("classifies a date in a previous year with the year", () => {
    expect(classifyDayLabel("2024-06-15T20:00:00Z", now)).toEqual({
      kind: "date",
      withYear: true,
    });
  });

  it("resolves local-midnight boundaries using local days, not UTC days", () => {
    // `now` is 2025-06-14 23:00 local (crosses into 2025-06-15 in UTC).
    const nowNearLocalMidnight = new Date("2025-06-15T03:00:00Z");

    // Same local day as `now` (2025-06-14), despite being on the previous
    // UTC calendar day.
    expect(
      classifyDayLabel("2025-06-14T05:00:00Z", nowNearLocalMidnight),
    ).toEqual({ kind: "today" });

    // Previous local day (2025-06-13).
    expect(
      classifyDayLabel("2025-06-13T22:00:00Z", nowNearLocalMidnight),
    ).toEqual({ kind: "yesterday" });
  });
});

describe("buildThreadItems", () => {
  it("flags only the first message of a single day as isDayStart", () => {
    const messages = [
      textMessage("m1", "2025-06-15T14:00:00Z", 1),
      textMessage("m2", "2025-06-15T14:01:00Z", 1), // same sender, <5min → grouped
      textMessage("m3", "2025-06-15T14:02:00Z", 2), // different sender → group start
    ];

    const items = buildThreadItems(messages);

    expect(items).toHaveLength(messages.length);
    expect(items.map((i) => i.isDayStart)).toEqual([true, false, false]);
    expect(items.map((i) => i.isGroupStart)).toEqual([true, false, true]);
  });

  it("marks the first item of a second day as both isDayStart and isGroupStart", () => {
    const messages = [
      textMessage("m1", "2025-06-15T14:00:00Z", 1),
      textMessage("m2", "2025-06-15T14:01:00Z", 1),
      textMessage("m3", "2025-06-16T14:00:00Z", 1),
    ];

    const items = buildThreadItems(messages);

    expect(items[2].isDayStart).toBe(true);
    expect(items[2].isGroupStart).toBe(true);
  });

  it("breaks a same-sender run at midnight even within the 5-minute grouping window", () => {
    // 2025-06-10 23:59 local and 2025-06-11 00:01 local — 2 minutes apart,
    // same sender, but a day boundary sits between them.
    const messages = [
      textMessage("m1", "2025-06-11T03:59:00Z", 1),
      textMessage("m2", "2025-06-11T04:01:00Z", 1),
    ];

    const items = buildThreadItems(messages);

    expect(items[0].dayKey).not.toBe(items[1].dayKey);
    expect(items[1].isDayStart).toBe(true);
    expect(items[1].isGroupStart).toBe(true);
  });

  it("buckets a message by local day even when its UTC day differs", () => {
    const messages = [
      textMessage("m1", "2025-03-02T12:00:00Z", 1),
      // Local day 2025-03-02 (EST) despite the 03-03 UTC date.
      textMessage("m2", "2025-03-03T04:30:00Z", 1),
    ];

    const items = buildThreadItems(messages);

    expect(items[0].dayKey).toBe(items[1].dayKey);
    expect(items[1].isDayStart).toBe(false);
  });

  it("lets a system notice break the run without giving it its own separator", () => {
    const messages: ChatMessageNode[] = [
      textMessage("m1", "2025-06-15T14:00:00Z", 1),
      memberJoined("m2", "2025-06-15T14:01:00Z", 2),
      textMessage("m3", "2025-06-15T14:02:00Z", 1),
    ];

    const items = buildThreadItems(messages);

    expect(items.map((i) => i.isDayStart)).toEqual([true, false, false]);
    // The system notice breaks grouping for itself and the message after it.
    expect(items.map((i) => i.isGroupStart)).toEqual([true, true, true]);
  });

  it("recomputes isDayStart correctly across the full array when older history is prepended", () => {
    const day2Only = [
      textMessage("m3", "2025-06-16T14:00:00Z", 1),
      textMessage("m4", "2025-06-16T14:01:00Z", 1),
    ];
    const itemsBefore = buildThreadItems(day2Only);
    expect(itemsBefore[0].isDayStart).toBe(true);

    // Simulate an older-history prepend: day 1 messages are added ahead of
    // the already-loaded day 2 messages.
    const withOlderDayPrepended = [
      textMessage("m1", "2025-06-15T14:00:00Z", 1),
      textMessage("m2", "2025-06-15T14:01:00Z", 1),
      ...day2Only,
    ];
    const itemsAfter = buildThreadItems(withOlderDayPrepended);

    expect(itemsAfter[0].isDayStart).toBe(true); // revealed day 1 start
    expect(itemsAfter[2].isDayStart).toBe(true); // day 2 start still correct
  });
});

describe("reconcileMessages", () => {
  it("upserts a changed node (edit/delete) in place", () => {
    const prev = [
      edge(textMessage("m1", "2025-06-15T14:00:00Z", 1, "original")),
      edge(textMessage("m2", "2025-06-15T14:01:00Z", 1, "second")),
    ];
    const editedM1 = textMessage("m1", "2025-06-15T14:00:00Z", 1, "edited");
    const incoming = [edge(editedM1)];

    const result = reconcileMessages(prev, incoming);

    expect(result).toHaveLength(2);
    const m1 = result.find((e) => e.node.id === "m1");
    expect((m1?.node as TextChatMessageNode).content).toBe("edited");
  });

  it("inserts a new tail message in sorted position", () => {
    const prev = [
      edge(textMessage("m1", "2025-06-15T14:00:00Z", 1)),
      edge(textMessage("m2", "2025-06-15T14:01:00Z", 1)),
    ];
    const incoming = [
      edge(textMessage("m2", "2025-06-15T14:01:00Z", 1)),
      edge(textMessage("m3", "2025-06-15T14:02:00Z", 1)),
    ];

    const result = reconcileMessages(prev, incoming);

    expect(result.map((e) => e.node.id)).toEqual(["m1", "m2", "m3"]);
  });

  it("retains older loaded history not present in the incoming window", () => {
    const prev = [
      edge(textMessage("m0", "2025-06-14T14:00:00Z", 1)), // older, not in incoming
      edge(textMessage("m1", "2025-06-15T14:00:00Z", 1)),
    ];
    const incoming = [edge(textMessage("m1", "2025-06-15T14:00:00Z", 1))];

    const result = reconcileMessages(prev, incoming);

    expect(result.map((e) => e.node.id)).toEqual(["m0", "m1"]);
  });

  it("dedups by id when the same message appears in both prev and incoming", () => {
    const m1 = textMessage("m1", "2025-06-15T14:00:00Z", 1);
    const result = reconcileMessages([edge(m1)], [edge(m1)]);

    expect(result).toHaveLength(1);
  });
});

describe("hasReconnectGap", () => {
  it("is false when there is no prior or no incoming history", () => {
    const someEdge = edge(textMessage("m1", "2025-06-15T14:00:00Z", 1));
    expect(hasReconnectGap([], [someEdge])).toBe(false);
    expect(hasReconnectGap([someEdge], [])).toBe(false);
  });

  it("is false when the incoming window overlaps the retained tail", () => {
    const prev = [edge(textMessage("m1", "2025-06-15T14:00:00Z", 1))];
    const incoming = [
      edge(textMessage("m1", "2025-06-15T14:00:00Z", 1)),
      edge(textMessage("m2", "2025-06-15T14:05:00Z", 1)),
    ];

    expect(hasReconnectGap(prev, incoming)).toBe(false);
  });

  it("is true when the incoming window's oldest message is strictly newer than the retained tail's newest", () => {
    const prev = [edge(textMessage("m1", "2025-06-15T14:00:00Z", 1))];
    const incoming = [edge(textMessage("m2", "2025-06-15T15:00:00Z", 1))];

    expect(hasReconnectGap(prev, incoming)).toBe(true);
  });
});
