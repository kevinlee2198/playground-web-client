"use client";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { FormTextareaField, FormTextField } from "@/components/ui/form-field";
import { UnitPreference } from "@/lib/constants";
import type { CreatePlayerInput } from "@/lib/types/player";
import { feetInchesToCm, lbsToKg } from "@/lib/unit-conversion";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import {
  countWords,
  playerFormSchema,
  type PlayerFormValues,
} from "./player-form-fields";

interface CreatePlayerFormProps {
  userDefaults?: { firstName: string; lastName: string };
  onSubmit: (data: CreatePlayerInput) => Promise<void>;
  isPending?: boolean;
  unitPreference?: UnitPreference;
}

export function CreatePlayerForm({
  userDefaults,
  onSubmit,
  isPending = false,
  unitPreference = UnitPreference.METRIC,
}: CreatePlayerFormProps) {
  const t = useTranslations();

  const defaultValues: PlayerFormValues = {
    firstName: userDefaults?.firstName ?? "",
    lastName: userDefaults?.lastName ?? "",
    biography: "",
  };

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
        firstName: value.firstName,
        lastName: value.lastName,
        age: value.age,
        height,
        weight,
        biography: value.biography || undefined,
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
        <form.Field name="firstName">
          {(field) => (
            <FormTextField
              field={field}
              label={t("player.form.firstName")}
              required
              disabled={isPending}
              placeholder={t("player.form.firstName")}
            />
          )}
        </form.Field>

        <form.Field name="lastName">
          {(field) => (
            <FormTextField
              field={field}
              label={t("player.form.lastName")}
              required
              disabled={isPending}
              placeholder={t("player.form.lastName")}
            />
          )}
        </form.Field>
      </FieldGroup>

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

      <form.Field name="biography">
        {(field) => (
          <FormTextareaField
            field={field}
            label={t("player.form.biography")}
            disabled={isPending}
            placeholder={t("player.form.biography")}
            rows={5}
            footer={
              <div className="text-sm text-muted-foreground">
                {t("player.form.biographyWordCount", {
                  count: countWords(field.state.value || ""),
                })}
              </div>
            }
          />
        )}
      </form.Field>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? t("player.actions.saving") : t("player.actions.create")}
        </Button>
      </div>
    </form>
  );
}
