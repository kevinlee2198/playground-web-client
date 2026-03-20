"use client";

import { FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GameVisibility } from "@/lib/constants";
import { useTranslations } from "next-intl";

interface VisibilityRadioGroupProps {
  value: GameVisibility;
  onChange: (value: GameVisibility) => void;
  onBlur: () => void;
  disabled?: boolean;
}

const VISIBILITY_OPTIONS = [
  { value: GameVisibility.PUBLIC, labelKey: "public", descriptionKey: "publicDescription" },
  { value: GameVisibility.PROTECTED, labelKey: "protected", descriptionKey: "protectedDescription" },
  { value: GameVisibility.PRIVATE, labelKey: "private", descriptionKey: "privateDescription" },
] as const;

export function VisibilityRadioGroup({
  value,
  onChange,
  onBlur,
  disabled,
}: VisibilityRadioGroupProps) {
  const t = useTranslations("game.visibility");

  return (
    <FieldSet>
      <FieldLegend variant="label">{t("label")}</FieldLegend>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as GameVisibility)}
        onBlur={onBlur}
        disabled={disabled}
      >
        {VISIBILITY_OPTIONS.map((option) => (
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
