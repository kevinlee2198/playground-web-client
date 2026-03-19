"use client";

import { cn } from "@/lib/utils";
import type { SportType } from "@/lib/constants";
import { useTranslations } from "next-intl";

const sportEmoji: Record<SportType, string> = {
  BASKETBALL: "🏀",
  TENNIS: "🎾",
  FOOTBALL: "🏈",
  PICKLEBALL: "🥒",
  BASEBALL: "⚾",
};

const sportBgClass: Record<SportType, string> = {
  BASKETBALL: "bg-sport-basketball",
  TENNIS: "bg-sport-tennis",
  FOOTBALL: "bg-sport-football",
  PICKLEBALL: "bg-sport-pickleball",
  BASEBALL: "bg-sport-baseball",
};

interface SportEmojiPillProps {
  sportType: SportType;
  className?: string;
}

export function SportEmojiPill({ sportType, className }: SportEmojiPillProps) {
  const t = useTranslations();

  return (
    <span
      aria-label={t(`sports.${sportType}`)}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-sm",
        sportBgClass[sportType],
        className,
      )}
    >
      {sportEmoji[sportType]}
    </span>
  );
}
