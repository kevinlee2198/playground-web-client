"use client";

import { Button } from "@/components/ui/button";
import { TypographyMuted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { Loader2, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

interface LocationIndicatorProps {
  locationName: string | null;
  hasLocation: boolean;
  isDetecting: boolean;
  onChangeClick: () => void;
}

export function LocationIndicator({
  locationName,
  hasLocation,
  isDetecting,
  onChangeClick,
}: LocationIndicatorProps) {
  const t = useTranslations();

  if (isDetecting) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <Loader2
          className="size-3.5 shrink-0 motion-safe:animate-spin"
          aria-hidden="true"
        />
        <TypographyMuted className="min-w-0 truncate">
          {t("game.discover.detectingLocation")}
        </TypographyMuted>
      </div>
    );
  }

  // Three cases:
  // 1. No location filter active → "Games everywhere"
  // 2. Location filter active, place name known → "Games near {name}"
  // 3. Location filter active, no place name (browser geolocation) → "Games near you"
  let label: string;
  if (!hasLocation) {
    label = t("game.discover.gamesEverywhere");
  } else if (locationName !== null) {
    label = t("game.discover.gamesNear", { location: locationName });
  } else {
    label = t("game.discover.gamesNearYou");
  }

  return (
    <div className={cn("flex items-center gap-2 min-w-0")}>
      <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
      <TypographyMuted className="min-w-0 truncate">{label}</TypographyMuted>
      <Button variant="ghost" size="sm" onClick={onChangeClick}>
        {hasLocation
          ? t("game.discover.changeLocation")
          : t("game.discover.setLocation")}
      </Button>
    </div>
  );
}
