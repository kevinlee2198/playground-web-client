"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { FormSelectField } from "@/components/ui/form-field";
import { Toggle } from "@/components/ui/toggle";
import { SportType } from "@/lib/constants";
import { updatePreferences, type UpdatePreferencesInput } from "../actions";
import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

const sportTypes = Object.values(SportType);

function sportI18nKey(sport: string): string {
  return `games.sports.${sport.toLowerCase()}` as const;
}

interface GamesSettingsFormProps {
  measurementUnit: string;
  preferredSports: string[];
}

export function GamesSettingsForm({
  measurementUnit,
  preferredSports,
}: GamesSettingsFormProps) {
  const t = useTranslations("settings");
  const [isPending, startTransition] = useTransition();

  const measurementOptions = [
    { value: "METRIC", label: t("games.measurementUnitOptions.metric") },
    { value: "IMPERIAL", label: t("games.measurementUnitOptions.imperial") },
  ];

  const form = useForm({
    defaultValues: {
      measurementUnit,
      preferredSports,
    },
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        const input: UpdatePreferencesInput = {};
        if (value.measurementUnit !== measurementUnit) {
          input.measurementUnit = value.measurementUnit;
        }
        const oldSet = new Set(preferredSports);
        const sportsChanged =
          value.preferredSports.length !== oldSet.size ||
          value.preferredSports.some((s) => !oldSet.has(s));
        if (sportsChanged) {
          input.preferredSports = value.preferredSports;
        }
        if (Object.keys(input).length === 0) {
          toast.success(t("saveSuccess"));
          return;
        }
        const result = await updatePreferences(input);
        if (result.success) {
          toast.success(t("saveSuccess"));
        } else {
          toast.error(t("saveError"));
        }
      });
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
      <form.Field name="measurementUnit">
        {(field) => (
          <FormSelectField
            field={field}
            label={t("games.measurementUnit")}
            options={measurementOptions}
          />
        )}
      </form.Field>

      <form.Field name="preferredSports">
        {(field) => {
          const selected = field.state.value;
          const toggle = (sport: string) => {
            const next = selected.includes(sport)
              ? selected.filter((s) => s !== sport)
              : [...selected, sport];
            field.handleChange(next);
          };
          return (
            <Field>
              <FieldLabel id="preferred-sports-label">
                {t("games.preferredSports")}
              </FieldLabel>
              <FieldDescription>
                {t("games.preferredSportsDescription")}
              </FieldDescription>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-labelledby="preferred-sports-label"
              >
                {sportTypes.map((sport) => (
                  <Toggle
                    key={sport}
                    variant="outline"
                    pressed={selected.includes(sport)}
                    onPressedChange={() => toggle(sport)}
                  >
                    {t(sportI18nKey(sport))}
                  </Toggle>
                ))}
              </div>
            </Field>
          );
        }}
      </form.Field>

      <Button type="submit" disabled={isPending}>
        {isPending && (
          <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />
        )}
        {t("saveChanges")}
      </Button>
    </form>
  );
}
