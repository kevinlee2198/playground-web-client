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
import { GameVisibility, PickleballScoringType, SportType } from "@/lib/constants";
import { locationToValue } from "@/lib/location-utils";
import type { GameMetadata, UpdateGameInput } from "@/lib/types/game";
import type { Location, LocationValue } from "@/lib/types/location";
import { useForm } from "@tanstack/react-form";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateGameFormSchema } from "./game-form-fields";
import { VisibilityRadioGroup } from "./visibility-radio-group";

interface UpdateGameFormProps {
  gameId: number;
  currentStartDate: string;
  metadata: GameMetadata;
  sportType: SportType;
  currentLocation?: Location | null;
  currentVisibility: GameVisibility;
  onSuccess?: () => void;
}

function buildDefaultValues(
  currentStartDate: string,
  metadata: GameMetadata,
  currentVisibility: GameVisibility,
  currentLocation?: Location | null,
) {
  const isBaseball = metadata.__typename === "BaseballGameMetadata";
  const hasPeriods =
    metadata.__typename === "BasketballGameMetadata" ||
    metadata.__typename === "FootballGameMetadata";

  const isTennis = metadata.__typename === "TennisGameMetadata";
  const isPickleball = metadata.__typename === "PickleballGameMetadata";

  let bestOf: number | undefined;
  if (isTennis) {
    bestOf = metadata.bestOf;
  } else if (isPickleball) {
    bestOf = metadata.bestOf ?? undefined;
  }

  return {
    startDate: new Date(currentStartDate),
    periods: hasPeriods
      ? (metadata.periods ?? undefined)
      : (undefined as number | undefined),
    bestOf,
    tiebreakFinalSet: isTennis
      ? (metadata.tiebreakFinalSet as boolean | undefined)
      : (undefined as boolean | undefined),
    pointsPerGame: isPickleball
      ? (metadata.pointsPerGame ?? undefined)
      : (undefined as number | undefined),
    winByTwo: isPickleball
      ? (metadata.winByTwo ?? undefined)
      : (undefined as boolean | undefined),
    scoringType: isPickleball
      ? (metadata.scoringType ?? undefined)
      : (undefined as PickleballScoringType | undefined),
    innings: isBaseball ? (metadata.innings ?? undefined) : (undefined as number | undefined),
    location: (currentLocation
      ? locationToValue(currentLocation)
      : undefined) as LocationValue | null | undefined,
    visibility: currentVisibility,
  };
}

export function UpdateGameForm({
  gameId,
  currentStartDate,
  metadata,
  sportType,
  currentLocation,
  currentVisibility,
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
      currentVisibility,
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
          metadata.__typename === "TennisGameMetadata" ||
          metadata.__typename === "PickleballGameMetadata"
            ? metadata.bestOf
            : null;
        const originalTiebreakFinalSet =
          metadata.__typename === "TennisGameMetadata"
            ? metadata.tiebreakFinalSet
            : null;
        const originalPointsPerGame =
          metadata.__typename === "PickleballGameMetadata"
            ? metadata.pointsPerGame
            : null;
        const originalWinByTwo =
          metadata.__typename === "PickleballGameMetadata"
            ? metadata.winByTwo
            : null;
        const originalScoringType =
          metadata.__typename === "PickleballGameMetadata"
            ? metadata.scoringType
            : null;
        const originalInnings =
          metadata.__typename === "BaseballGameMetadata"
            ? metadata.innings
            : null;

        const periodsChanged = value.periods !== originalPeriods;
        const bestOfChanged = value.bestOf !== originalBestOf;
        const tiebreakChanged =
          value.tiebreakFinalSet !== originalTiebreakFinalSet;
        const pointsPerGameChanged =
          value.pointsPerGame !== originalPointsPerGame;
        const winByTwoChanged = value.winByTwo !== originalWinByTwo;
        const scoringTypeChanged = value.scoringType !== originalScoringType;
        const inningsChanged = value.innings !== originalInnings;

        if (
          periodsChanged ||
          bestOfChanged ||
          tiebreakChanged ||
          pointsPerGameChanged ||
          winByTwoChanged ||
          scoringTypeChanged ||
          inningsChanged
        ) {
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
          } else if (sportType === SportType.PICKLEBALL) {
            input.metadata.pickleball = {};
            if (bestOfChanged && value.bestOf !== undefined) {
              input.metadata.pickleball.bestOf = value.bestOf;
            }
            if (pointsPerGameChanged && value.pointsPerGame !== undefined) {
              input.metadata.pickleball.pointsPerGame = value.pointsPerGame;
            }
            if (winByTwoChanged && value.winByTwo !== undefined) {
              input.metadata.pickleball.winByTwo = value.winByTwo;
            }
            if (scoringTypeChanged && value.scoringType !== undefined) {
              input.metadata.pickleball.scoringType = value.scoringType;
            }
          } else if (sportType === SportType.BASEBALL) {
            input.metadata.baseball = {};
            if (inningsChanged && value.innings !== undefined) {
              input.metadata.baseball.innings = value.innings;
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

        if (value.visibility !== undefined && value.visibility !== currentVisibility) {
          input.visibility = value.visibility;
        }

        const result = await updateGame(input);

        if (result.success) {
          locationDirtyRef.current = false;
          toast.success(t("game.success.updated"));
          onSuccess?.();
        } else {
          setError(result.message || t("game.errors.updateError"));
          toast.error(result.message || t("game.errors.updateError"));
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

      <form.Field name="visibility">
        {(field) => (
          <VisibilityRadioGroup
            value={field.state.value ?? currentVisibility}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            disabled={isPending}
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

          {sportType === SportType.PICKLEBALL && (
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
                        <SelectItem value="1">1</SelectItem>
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
              <form.Field name="pointsPerGame">
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
                      {t("game.form.pointsPerGame")}
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
                          placeholder={t("game.form.pointsPerGamePlaceholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="11">11</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="21">21</SelectItem>
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
              <form.Field name="scoringType">
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
                      {t("game.form.scoringType")}
                    </FieldLabel>
                    <Select
                      value={field.state.value ?? null}
                      onValueChange={(v) => {
                        field.handleChange(v as PickleballScoringType);
                        field.handleBlur();
                      }}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={t("game.form.selectScoringType")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PickleballScoringType.RALLY}>
                          {t("game.metadata.scoringType.RALLY")}
                        </SelectItem>
                        <SelectItem value={PickleballScoringType.SIDE_OUT}>
                          {t("game.metadata.scoringType.SIDE_OUT")}
                        </SelectItem>
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
              <form.Field name="winByTwo">
                {(field) => (
                  <FormSwitchField
                    field={field}
                    label={t("game.form.winByTwo")}
                    disabled={isPending}
                  />
                )}
              </form.Field>
            </>
          )}

          {sportType === SportType.BASEBALL && (
            <form.Field name="innings">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.form.innings")}
                  type="number"
                  disabled={isPending}
                  placeholder={t("game.form.inningsPlaceholder")}
                />
              )}
            </form.Field>
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
