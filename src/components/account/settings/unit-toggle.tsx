"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUnitPreference } from "@/hooks/use-unit-preference";
import { UnitPreference } from "@/lib/constants";
import { useTranslations } from "next-intl";

export function UnitToggle() {
  const t = useTranslations("units");
  const { preference, setPreference } = useUnitPreference();

  const handleToggle = (checked: boolean) => {
    setPreference(checked ? UnitPreference.METRIC : UnitPreference.IMPERIAL);
  };

  return (
    <div className="flex items-center gap-3">
      <Label htmlFor="unit-toggle" className="text-sm font-medium">
        {t("imperial")}
      </Label>
      <Switch
        id="unit-toggle"
        checked={preference === UnitPreference.METRIC}
        onCheckedChange={handleToggle}
      />
      <Label htmlFor="unit-toggle" className="text-sm font-medium">
        {t("metric")}
      </Label>
    </div>
  );
}
