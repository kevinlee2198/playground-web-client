"use client";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { FormTextField } from "@/components/ui/form-field";
import { UnitPreference } from "@/lib/constants";
import type { Player, UpdatePlayerInput } from "@/lib/types/player";
import {
  cmToFeetInches,
  feetInchesToCm,
  kgToLbs,
  lbsToKg,
} from "@/lib/unit-conversion";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { playerFormSchema, type PlayerFormValues } from "./player-form-fields";

function buildDefaultValues(
  initialData: Player,
  unitPreference: UnitPreference,
): PlayerFormValues {
  let heightCm: number | undefined;
  let heightFeet: number | undefined;
  let heightInches: number | undefined;
  let weightKg: number | undefined;
  let weightLbs: number | undefined;

  if (initialData.height) {
    if (unitPreference === UnitPreference.METRIC) {
      heightCm = initialData.height;
    } else {
      const converted = cmToFeetInches(initialData.height);
      heightFeet = converted.feet;
      heightInches = converted.inches;
    }
  }

  if (initialData.weight) {
    if (unitPreference === UnitPreference.METRIC) {
      weightKg = initialData.weight;
    } else {
      weightLbs = Math.round(kgToLbs(initialData.weight));
    }
  }

  return {
    age: initialData.age ?? undefined,
    heightCm,
    heightFeet,
    heightInches,
    weightKg,
    weightLbs,
  };
}

interface UpdatePlayerFormProps {
  initialData: Player;
  onSubmit: (data: UpdatePlayerInput) => Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
  unitPreference?: UnitPreference;
}

export function UpdatePlayerForm({
  initialData,
  onSubmit,
  onCancel,
  isPending = false,
  unitPreference = UnitPreference.METRIC,
}: UpdatePlayerFormProps) {
  const t = useTranslations();

  const form = useForm({
    defaultValues: buildDefaultValues(initialData, unitPreference),
    validators: {
      onBlur: playerFormSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const input: UpdatePlayerInput = { id: initialData.id };

      const isDirty = (name: keyof PlayerFormValues) =>
        formApi.getFieldMeta(name)?.isDirty ?? false;

      if (isDirty("age")) {
        input.age = value.age ?? null;
      }
      if (
        isDirty("heightCm") ||
        isDirty("heightFeet") ||
        isDirty("heightInches")
      ) {
        if (unitPreference === UnitPreference.METRIC) {
          input.height = value.heightCm ?? null;
        } else {
          const feet = value.heightFeet ?? 0;
          const inches = value.heightInches ?? 0;
          input.height =
            feet > 0 || inches > 0 ? feetInchesToCm(feet, inches) : null;
        }
      }
      if (isDirty("weightKg") || isDirty("weightLbs")) {
        if (unitPreference === UnitPreference.METRIC) {
          input.weight = value.weightKg ?? null;
        } else {
          input.weight = value.weightLbs ? lbsToKg(value.weightLbs) : null;
        }
      }

      await onSubmit(input);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-6"
    >
      <FieldGroup className="sm:flex-row">
        <form.Field name="age">
          {(field) => (
            <FormTextField
              field={field}
              label={t("player.form.age")}
              type="number"
              disabled={isPending}
              placeholder={t("player.form.age")}
            />
          )}
        </form.Field>

        {unitPreference === UnitPreference.METRIC ? (
          <form.Field name="heightCm">
            {(field) => (
              <FormTextField
                field={field}
                label={`${t("player.form.height")} (${t("units.cm")})`}
                type="number"
                disabled={isPending}
                placeholder="170"
              />
            )}
          </form.Field>
        ) : (
          <>
            <form.Field name="heightFeet">
              {(field) => (
                <FormTextField
                  field={field}
                  label={`${t("player.form.height")} (${t("units.ft")})`}
                  type="number"
                  disabled={isPending}
                  placeholder="5"
                />
              )}
            </form.Field>
            <form.Field name="heightInches">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("units.in")}
                  type="number"
                  disabled={isPending}
                  placeholder="10"
                />
              )}
            </form.Field>
          </>
        )}
      </FieldGroup>

      <FieldGroup className="sm:flex-row">
        {unitPreference === UnitPreference.METRIC ? (
          <form.Field name="weightKg">
            {(field) => (
              <FormTextField
                field={field}
                label={`${t("player.form.weight")} (${t("units.kg")})`}
                type="number"
                disabled={isPending}
                placeholder="70"
              />
            )}
          </form.Field>
        ) : (
          <form.Field name="weightLbs">
            {(field) => (
              <FormTextField
                field={field}
                label={`${t("player.form.weight")} (${t("units.lbs")})`}
                type="number"
                disabled={isPending}
                placeholder="154"
              />
            )}
          </form.Field>
        )}
      </FieldGroup>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          {t("actions.cancel")}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? t("player.actions.saving") : t("actions.save")}
        </Button>
      </div>
    </form>
  );
}
