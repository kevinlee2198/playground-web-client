"use client";

import { Button } from "@/components/ui/button";
import { TypographyMuted } from "@/components/ui/typography";
import { DISTANCE_PRESETS_MILES } from "@/lib/location-detection";
import { useTranslations } from "next-intl";

interface DistancePresetsProps {
  selected: number;
  onSelect: (miles: number) => void;
}

export function DistancePresets({ selected, onSelect }: DistancePresetsProps) {
  const t = useTranslations();

  return (
    <div className="flex items-center gap-2 overflow-x-auto overscroll-x-contain pb-1">
      <TypographyMuted className="shrink-0 text-sm">
        {t("game.discover.distancePresets.label")}
      </TypographyMuted>
      {DISTANCE_PRESETS_MILES.map((miles) => (
        <Button
          key={miles}
          variant={selected === miles ? "default" : "outline"}
          size="sm"
          className="shrink-0 tabular-nums"
          data-selected={selected === miles}
          onClick={() => onSelect(miles)}
        >
          {t("game.discover.distancePresets.miles", { distance: miles })}
        </Button>
      ))}
    </div>
  );
}
