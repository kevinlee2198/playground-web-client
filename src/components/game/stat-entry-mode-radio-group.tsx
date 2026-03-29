"use client";

import { FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { StatEntryMode } from "@/lib/constants";
import { useTranslations } from "next-intl";

interface StatEntryModeRadioGroupProps {
  value: StatEntryMode;
  onChange: (value: StatEntryMode) => void;
  onBlur: () => void;
  disabled?: boolean;
}

const STAT_ENTRY_MODE_OPTIONS = [
  { value: StatEntryMode.OPEN, labelKey: "open", descriptionKey: "openDescription" },
  { value: StatEntryMode.SELF_REPORT, labelKey: "selfReport", descriptionKey: "selfReportDescription" },
  { value: StatEntryMode.MANAGER_ONLY, labelKey: "managerOnly", descriptionKey: "managerOnlyDescription" },
] as const;

export function StatEntryModeRadioGroup({
  value,
  onChange,
  onBlur,
  disabled,
}: StatEntryModeRadioGroupProps) {
  const t = useTranslations("game.statEntryMode");

  return (
    <FieldSet>
      <FieldLegend variant="label">{t("label")}</FieldLegend>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as StatEntryMode)}
        onBlur={onBlur}
        disabled={disabled}
      >
        {STAT_ENTRY_MODE_OPTIONS.map((option) => (
          <FieldLabel key={option.value} className="cursor-pointer">
            <RadioGroupItem value={option.value} />
            <div>
              <span className="text-sm font-medium">
                {t(option.labelKey)}
              </span>
              <FieldDescription>
                {t(option.descriptionKey)}
              </FieldDescription>
            </div>
          </FieldLabel>
        ))}
      </RadioGroup>
    </FieldSet>
  );
}
