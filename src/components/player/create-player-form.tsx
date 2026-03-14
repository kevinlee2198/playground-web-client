"use client";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { FormTextField } from "@/components/ui/form-field";
import { UnitPreference } from "@/lib/constants";
import type { CreatePlayerInput } from "@/lib/types/player";
import { feetInchesToCm, lbsToKg } from "@/lib/unit-conversion";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { playerFormSchema, type PlayerFormValues } from "./player-form-fields";

interface CreatePlayerFormProps {
  onSubmit: (data: CreatePlayerInput) => Promise<void>;
  isPending?: boolean;
  unitPreference?: UnitPreference;
}

export function CreatePlayerForm({
  onSubmit,
  isPending = false,
  unitPreference = UnitPreference.METRIC,
}: CreatePlayerFormProps) {
  const t = useTranslations();

  const defaultValues: PlayerFormValues = {};

  const form = useForm({
    defaultValues,
    validators: {
      onBlur: playerFormSchema,
    },
    onSubmit: async ({ value }) => {
      let height: number | undefined;
      if (unitPreference === UnitPreference.METRIC) {
        height = value.heightCm;
      } else {
        const feet = value.heightFeet ?? 0;
        const inches = value.heightInches ?? 0;
        if (feet > 0 || inches > 0) {
          height = feetInchesToCm(feet, inches);
        }
      }

      let weight: number | undefined;
      if (unitPreference === UnitPreference.METRIC) {
        weight = value.weightKg;
      } else {
        weight = value.weightLbs ? lbsToKg(value.weightLbs) : undefined;
      }

      const input: CreatePlayerInput = {
        age: value.age,
        height,
        weight,
      };

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
        <Button type="submit" disabled={isPending}>
          {isPending ? t("player.actions.saving") : t("player.actions.create")}
        </Button>
      </div>
    </form>
  );
}
