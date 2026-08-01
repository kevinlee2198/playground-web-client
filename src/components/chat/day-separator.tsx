"use client";

import { Marker, MarkerContent } from "@/components/ui/marker";
import { classifyDayLabel } from "./chat-thread-utils";
import { useFormatter, useNow, useTranslations } from "next-intl";

interface DaySeparatorProps {
  /** === the day's first message's createdDate; used only to derive the label. */
  timestamp: string;
}

/**
 * Renders the localized day-boundary label ("Today" / "Yesterday" / absolute
 * date). Decorative only — `aria-hidden` so it's never announced as content
 * (distinct from system notices, which ARE announced; see system-message-bubble.tsx).
 *
 * `now` is captured once via `useNow()` (no interval): relative labels need
 * not update live across midnight while the thread stays open.
 */
export function DaySeparator({ timestamp }: DaySeparatorProps) {
  const t = useTranslations("chat.thread");
  const tTime = useTranslations("chat.time");
  const format = useFormatter();
  const now = useNow();

  const kind = classifyDayLabel(timestamp, now);
  const label =
    kind.kind === "today"
      ? t("today")
      : kind.kind === "yesterday"
        ? tTime("yesterday")
        : format.dateTime(
            new Date(timestamp),
            kind.withYear
              ? { month: "long", day: "numeric", year: "numeric" }
              : { month: "long", day: "numeric" },
          );

  return (
    <Marker
      variant="separator"
      aria-hidden="true"
      className="my-2"
      data-testid="day-separator"
    >
      <MarkerContent>{label}</MarkerContent>
    </Marker>
  );
}
