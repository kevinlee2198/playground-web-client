"use client";

import { cn } from "@/lib/utils";
import { GameStatus } from "@/lib/constants";
import { useTranslations } from "next-intl";

const STATUS_OPTIONS: { value: GameStatus; labelKey: string }[] = [
  { value: GameStatus.SCHEDULED, labelKey: "upcoming" },
  { value: GameStatus.IN_PROGRESS, labelKey: "live" },
  { value: GameStatus.COMPLETE, labelKey: "completed" },
];

interface StatusFilterChipsProps {
  selected: GameStatus | null;
  onSelect: (status: GameStatus | null) => void;
  disabled?: boolean;
}

export function StatusFilterChips({
  selected,
  onSelect,
  disabled = false,
}: StatusFilterChipsProps) {
  const t = useTranslations("game.discover");

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("statusFilter")}>
      {STATUS_OPTIONS.map(({ value, labelKey }) => (
        <button
          key={value}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(selected === value ? null : value)}
          className={cn(
            "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors",
            selected === value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:bg-muted/80",
            disabled && "opacity-50 cursor-not-allowed",
          )}
          aria-pressed={selected === value}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
