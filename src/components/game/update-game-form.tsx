"use client";

import { updateGame } from "@/app/[locale]/game/actions";
import { LocationAutocomplete } from "@/components/location/location-autocomplete";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  FormDateTimeField,
  FormSwitchField,
  FormTextField,
  toFieldErrors,
} from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SportType } from "@/lib/constants";
import { locationToValue } from "@/lib/location-utils";
import type { GameMetadata, UpdateGameInput } from "@/lib/types/game";
import type { Location, LocationValue } from "@/lib/types/location";
import { useForm } from "@tanstack/react-form";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateGameFormSchema } from "./game-form-fields";

interface UpdateGameFormProps {
  gameId: number;
  currentStartDate: string;
  metadata: GameMetadata;
  sportType: SportType;
  currentLocation?: Location | null;
  onSuccess?: () => void;
}

function buildDefaultValues(
  currentStartDate: string,
  metadata: GameMetadata,
  currentLocation?: Location | null,
) {
  return {
    startDate: new Date(currentStartDate),
    periods:
      metadata.__typename === "BasketballGameMetadata" ||
      metadata.__typename === "FootballGameMetadata"
        ? (metadata.periods ?? undefined)
        : (undefined as number | undefined),
    bestOf:
      metadata.__typename === "TennisGameMetadata"
        ? (metadata.bestOf as number | undefined)
        : (undefined as number | undefined),
    tiebreakFinalSet:
      metadata.__typename === "TennisGameMetadata"
        ? (metadata.tiebreakFinalSet as boolean | undefined)
        : (undefined as boolean | undefined),
    location: (currentLocation
      ? locationToValue(currentLocation)
      : undefined) as LocationValue | null | undefined,
  };
}

export function UpdateGameForm({
  gameId,
  currentStartDate,
  metadata,
  sportType,
  currentLocation,
  onSuccess,
}: UpdateGameFormProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const locationDirtyRef = useRef(false);

  const form = useForm({
    defaultValues: buildDefaultValues(
      currentStartDate,
      metadata,
      currentLocation,
    ),
    validators: {
      onBlur: ({ value }) => {
        const result = updateGameFormSchema.safeParse(value);
        if (result.success) return undefined;
        return result.error.issues.map((issue) => ({
          message: issue.message,
          path: issue.path,
        }));
      },
    },
    onSubmit: async ({ value }) => {
      setError(null);

      startTransition(async () => {
        const input: UpdateGameInput = {
          id: gameId,
          startDate: value.startDate.toISOString(),
        };

        const originalPeriods =
          metadata.__typename === "BasketballGameMetadata" ||
          metadata.__typename === "FootballGameMetadata"
            ? metadata.periods
            : null;
        const originalBestOf =
          metadata.__typename === "TennisGameMetadata" ? metadata.bestOf : null;
        const originalTiebreakFinalSet =
          metadata.__typename === "TennisGameMetadata"
            ? metadata.tiebreakFinalSet
            : null;

        const periodsChanged = value.periods !== originalPeriods;
        const bestOfChanged = value.bestOf !== originalBestOf;
        const tiebreakChanged =
          value.tiebreakFinalSet !== originalTiebreakFinalSet;

        if (periodsChanged || bestOfChanged || tiebreakChanged) {
          input.metadata = {};

          if (sportType === SportType.BASKETBALL) {
            input.metadata.basketball = {};
            if (periodsChanged && value.periods !== undefined) {
              input.metadata.basketball.periods = value.periods;
            }
          } else if (sportType === SportType.FOOTBALL) {
            input.metadata.football = {};
            if (periodsChanged && value.periods !== undefined) {
              input.metadata.football.periods = value.periods;
            }
          } else if (sportType === SportType.TENNIS) {
            input.metadata.tennis = {};
            if (bestOfChanged && value.bestOf !== undefined) {
              input.metadata.tennis.bestOf = value.bestOf;
            }
            if (tiebreakChanged && value.tiebreakFinalSet !== undefined) {
              input.metadata.tennis.tiebreakFinalSet = value.tiebreakFinalSet;
            }
          }
        }

        if (locationDirtyRef.current) {
          if (value.location === null || value.location === undefined) {
            input.location = null;
          } else {
            input.location = {
              address: value.location.address,
              ...(value.location.coordinates && {
                coordinates: value.location.coordinates,
              }),
            };
          }
        }

        const result = await updateGame(input);

        if (result.success) {
          locationDirtyRef.current = false;
          toast.success(t("game.success.updated"));
          onSuccess?.();
        } else {
          setError(result.error || t("game.errors.updateError"));
          toast.error(result.error || t("game.errors.updateError"));
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
      className="space-y-4"
    >
      <form.Field name="startDate">
        {(field) => (
          <FormDateTimeField
            field={field}
            label={t("game.form.startDate")}
            required
            disabled={isPending}
            placeholder={t("game.form.selectDate")}
          />
        )}
      </form.Field>

      <form.Field name="location">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="location">
              {t("game.form.location")}
            </FieldLabel>
            <LocationAutocomplete
              value={field.state.value ?? null}
              onSelect={(loc) => {
                field.handleChange(loc);
                locationDirtyRef.current = true;
              }}
              onClear={() => {
                field.handleChange(null);
                locationDirtyRef.current = true;
              }}
              disabled={isPending}
            />
          </Field>
        )}
      </form.Field>

      <Collapsible>
        <CollapsibleTrigger
          render={<Button variant="link" type="button" className="px-0" />}
        >
          {t("game.form.advancedOptions")}
          <ChevronDown className="ml-1 h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          {(sportType === SportType.BASKETBALL ||
            sportType === SportType.FOOTBALL) && (
            <form.Field name="periods">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.form.periods")}
                  type="number"
                  disabled={isPending}
                  placeholder="4"
                />
              )}
            </form.Field>
          )}

          {sportType === SportType.TENNIS && (
            <>
              <form.Field name="bestOf">
                {(field) => (
                  <Field
                    data-invalid={
                      field.state.meta.isTouched &&
                      field.state.meta.errors.length > 0
                        ? true
                        : undefined
                    }
                  >
                    <FieldLabel htmlFor={field.name}>
                      {t("game.form.bestOf")}
                    </FieldLabel>
                    <Select
                      value={field.state.value?.toString() ?? null}
                      onValueChange={(v) => {
                        field.handleChange(Number(v));
                        field.handleBlur();
                      }}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={t("game.form.bestOfPlaceholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                      </SelectContent>
                    </Select>
                    {field.state.meta.isTouched && (
                      <FieldError
                        errors={toFieldErrors(field.state.meta.errors)}
                      />
                    )}
                  </Field>
                )}
              </form.Field>
              <form.Field name="tiebreakFinalSet">
                {(field) => (
                  <FormSwitchField
                    field={field}
                    label={t("game.form.tiebreakFinalSet")}
                    disabled={isPending}
                  />
                )}
              </form.Field>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? t("game.actions.saving") : t("actions.save")}
        </Button>
      </div>
    </form>
  );
}
