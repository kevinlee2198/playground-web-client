"use client";

import { SportIcon } from "@/components/game/sport-icon";
import { SportType, getSportBgClass, getSportFgClass } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const SPORT_TYPES = Object.values(SportType);

interface SportFilterPillsProps {
  selected: SportType | null;
  onSelect: (sportType: SportType | null) => void;
  disabled?: boolean;
}

export function SportFilterPills({
  selected,
  onSelect,
  disabled = false,
}: SportFilterPillsProps) {
  const t = useTranslations("game.discover");
  const tSports = useTranslations("sports");

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("allSports")}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(null)}
        className={cn(
          "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors",
          selected === null
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        aria-pressed={selected === null}
      >
        {t("allSports")}
      </button>
      {SPORT_TYPES.map((sport) => (
        <button
          key={sport}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(sport)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium transition-colors",
            selected === sport
              ? cn(getSportBgClass(sport), getSportFgClass(sport))
              : "bg-muted text-muted-foreground hover:bg-muted/80",
            disabled && "opacity-50 cursor-not-allowed",
          )}
          aria-pressed={selected === sport}
          aria-label={tSports(sport)}
        >
          <SportIcon sportType={sport} size="sm" />
        </button>
      ))}
    </div>
  );
}
