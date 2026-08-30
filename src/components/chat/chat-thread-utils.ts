import type { Edge } from "@/lib/graphql-connection";
import type { ChatMessageNode } from "@/lib/types/chat";
import { shouldShowSender } from "./chat-utils";

/** Local-timezone calendar-day bucket, formatted "YYYY-MM-DD". */
export type DayKey = string;

/**
 * One render row. Day separators are NOT separate items — they render
 * inside the first item of a day (see `isDayStart`).
 */
export interface MessageThreadItem {
  message: ChatMessageNode;
  /** Avatar + name + time shown (forced true after a day boundary). */
  isGroupStart: boolean;
  /** Render the day Marker above this item. */
  isDayStart: boolean;
  dayKey: DayKey;
  /** === message.createdDate; used only to derive the day label. */
  dayTimestamp: string;
}

function dayKeyFromDate(d: Date): DayKey {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Local-timezone calendar-day bucket (uses local getFullYear/getMonth/getDate
 * → viewer tz). Different-timezone viewers may bucket the same message
 * differently, by design — "Today" means the viewer's today.
 */
export function localDayKey(iso: string): DayKey {
  return dayKeyFromDate(new Date(iso));
}

/**
 * Pure. `messages` MUST be ascending by createdDate. Emits one item per
 * message; the first message of each local day carries isDayStart=true (its
 * item renders the day Marker). A day boundary always forces
 * isGroupStart=true. System notices participate in grouping (they break runs
 * via shouldShowSender) but never get their own separator.
 */
export function buildThreadItems(
  messages: ChatMessageNode[],
): MessageThreadItem[] {
  const items: MessageThreadItem[] = [];
  let prevDayKey: DayKey | null = null;
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const dayKey = localDayKey(message.createdDate);
    const isDayStart = dayKey !== prevDayKey;
    const isGroupStart = isDayStart || shouldShowSender(messages, i);
    items.push({
      message,
      isGroupStart,
      isDayStart,
      dayKey,
      dayTimestamp: message.createdDate,
    });
    prevDayKey = dayKey;
  }
  return items;
}

export type DayLabelKind =
  | { kind: "today" }
  | { kind: "yesterday" }
  | { kind: "date"; withYear: boolean };

/**
 * Pure. Classifies `timestamp`'s local day relative to `now`'s local day.
 * Never reads the wall clock directly — callers supply `now` (e.g. via
 * `useNow()`), which keeps this testable and avoids SSR/client drift.
 */
export function classifyDayLabel(timestamp: string, now: Date): DayLabelKind {
  const date = new Date(timestamp);
  const dayKey = dayKeyFromDate(date);

  if (dayKey === dayKeyFromDate(now)) return { kind: "today" };

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey === dayKeyFromDate(yesterday)) return { kind: "yesterday" };

  return { kind: "date", withYear: date.getFullYear() !== now.getFullYear() };
}

/**
 * Pure. Merge the recent window into the existing thread by id; keep older
 * loaded history; sort ascending by createdDate.
 */
export function reconcileMessages(
  prev: Edge<ChatMessageNode>[],
  incoming: Edge<ChatMessageNode>[],
): Edge<ChatMessageNode>[] {
  const byId = new Map(prev.map((e) => [e.node.id, e]));
  for (const e of incoming) byId.set(e.node.id, e);
  return [...byId.values()].sort(
    (a, b) =>
      new Date(a.node.createdDate).getTime() -
      new Date(b.node.createdDate).getTime(),
  );
}

/**
 * Pure. True when the newest window does NOT overlap the retained tail (a
 * gap of more than a page of messages arrived while offline). Strict
 * inequality: no overlap means a middle gap exists that cannot be silently
 * stitched.
 */
export function hasReconnectGap(
  prev: Edge<ChatMessageNode>[],
  incoming: Edge<ChatMessageNode>[],
): boolean {
  if (prev.length === 0 || incoming.length === 0) return false;
  const retainedNewest = Math.max(
    ...prev.map((e) => new Date(e.node.createdDate).getTime()),
  );
  const incomingOldest = Math.min(
    ...incoming.map((e) => new Date(e.node.createdDate).getTime()),
  );
  return incomingOldest > retainedNewest;
}
