"use client";

import { Button } from "@/components/ui/button";
import { TypographyMuted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { Loader2, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

interface LocationIndicatorProps {
  locationName: string | null;
  isDetecting: boolean;
  onChangeClick: () => void;
}

export function LocationIndicator({
  locationName,
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

  return (
    <div className={cn("flex items-center gap-2 min-w-0")}>
      <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
      <TypographyMuted className="min-w-0 truncate">
        {locationName !== null
          ? t("game.discover.gamesNear", { location: locationName })
          : t("game.discover.gamesEverywhere")}
      </TypographyMuted>
      <Button variant="ghost" size="sm" onClick={onChangeClick}>
        {locationName !== null
          ? t("game.discover.changeLocation")
          : t("game.discover.setLocation")}
      </Button>
    </div>
  );
}
