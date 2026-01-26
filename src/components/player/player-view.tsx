"use client";

import { Button } from "@/components/ui/button";
import { useUnitPreference } from "@/hooks/use-unit-preference";
import { UnitPreference } from "@/lib/constants";
import type { Player } from "@/lib/types/player";
import {
  formatHeightImperial,
  formatHeightMetric,
  formatWeightImperial,
  formatWeightMetric,
} from "@/lib/unit-conversion";
import { useTranslations } from "next-intl";

interface PlayerViewProps {
  player: Player;
  onEdit: () => void;
}

export function PlayerView({ player, onEdit }: PlayerViewProps) {
  const t = useTranslations();
  const { preference: unitPreference } = useUnitPreference();

  return (
    <div className="space-y-6">
      {/* Header with Name and Edit Button */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold">
            {player.firstName} {player.lastName}
          </h2>
        </div>
        <Button onClick={onEdit}>{t("actions.edit")}</Button>
      </div>

      {/* Physical Attributes */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            {t("profile.stats.age")}
          </div>
          <div className="mt-1 text-lg">
            {player.age
              ? `${player.age} ${t("profile.stats.years")}`
              : "\u00A0"}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-muted-foreground">
            {t("profile.stats.height")}
          </div>
          <div className="mt-1 text-lg">
            {player.height
              ? unitPreference === UnitPreference.METRIC
                ? formatHeightMetric(player.height)
                : formatHeightImperial(player.height)
              : "\u00A0"}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-muted-foreground">
            {t("profile.stats.weight")}
          </div>
          <div className="mt-1 text-lg">
            {player.weight
              ? unitPreference === UnitPreference.METRIC
                ? formatWeightMetric(player.weight)
                : formatWeightImperial(player.weight)
              : "\u00A0"}
          </div>
        </div>
      </div>

      {/* Biography */}
      {player.biography && (
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            {t("profile.stats.biography")}
          </div>
          <div className="mt-2 whitespace-pre-wrap text-base">
            {player.biography}
          </div>
        </div>
      )}
    </div>
  );
}
