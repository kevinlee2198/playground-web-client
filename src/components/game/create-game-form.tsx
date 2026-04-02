"use client";

import { createGame } from "@/app/[locale]/game/actions";
import { LocationAutocomplete } from "@/components/location/location-autocomplete";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  FormComboboxField,
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
import { useRouter } from "@/i18n/navigation";
import { GameVisibility, getFormats, PickleballScoringType, SportFormat, SportType, StatEntryMode } from "@/lib/constants";
import type { CreateGameInput } from "@/lib/types/game";
import type { LocationValue } from "@/lib/types/location";
import { useForm, useStore } from "@tanstack/react-form";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createGameFormSchema } from "./game-form-fields";
import { StatEntryModeRadioGroup } from "./stat-entry-mode-radio-group";
import { VisibilityRadioGroup } from "./visibility-radio-group";

const sportTypeOptions = Object.values(SportType);

function validateCreateGameForm({ value }: { value: unknown }) {
  const result = createGameFormSchema.safeParse(value);
  if (result.success) return undefined;
  return result.error.issues.map((issue) => ({
    message: issue.message,
    path: issue.path,
  }));
}

interface CreateGameFormProps {
  onSuccess?: () => void;
}

export function CreateGameForm({ onSuccess }: CreateGameFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      sportType: undefined as unknown as SportType,
      format: undefined as unknown as SportFormat,
      startDate: new Date(),
      periods: undefined as number | undefined,
      bestOf: undefined as number | undefined,
      tiebreakFinalSet: undefined as boolean | undefined,
      pointsPerGame: undefined as number | undefined,
      winByTwo: undefined as boolean | undefined,
      scoringType: undefined as PickleballScoringType | undefined,
      innings: undefined as number | undefined,
      location: undefined as LocationValue | undefined,
      visibility: GameVisibility.PUBLIC,
      statEntryMode: StatEntryMode.OPEN,
    },
    validators: {
      onBlur: validateCreateGameForm,
      onSubmit: validateCreateGameForm,
    },
    onSubmit: async ({ value }) => {
      setError(null);

      startTransition(async () => {
        const sportType = value.sportType;

        let input: CreateGameInput;

        if (sportType === SportType.BASEBALL) {
          input = {
            sportType: SportType.BASEBALL,
            startDate: value.startDate.toISOString(),
            visibility: value.visibility,
            statEntryMode: value.statEntryMode,
            metadata: {
              ...(value.innings !== undefined && { innings: value.innings }),
            },
          };
        } else if (sportType === SportType.BASKETBALL) {
          input = {
            sportType: SportType.BASKETBALL,
            startDate: value.startDate.toISOString(),
            visibility: value.visibility,
            statEntryMode: value.statEntryMode,
            metadata: {
              format: value.format as
                | SportFormat.FIVE_ON_FIVE
                | SportFormat.THREE_ON_THREE,
              ...(value.periods !== undefined && { periods: value.periods }),
            },
          };
        } else if (sportType === SportType.FOOTBALL) {
          input = {
            sportType: SportType.FOOTBALL,
            startDate: value.startDate.toISOString(),
            visibility: value.visibility,
            statEntryMode: value.statEntryMode,
            metadata: {
              format: value.format as
                | SportFormat.FLAG_FOOTBALL
                | SportFormat.AMERICAN_FOOTBALL,
              ...(value.periods !== undefined && { periods: value.periods }),
            },
          };
        } else if (sportType === SportType.PICKLEBALL) {
          input = {
            sportType: SportType.PICKLEBALL,
            startDate: value.startDate.toISOString(),
            visibility: value.visibility,
            statEntryMode: value.statEntryMode,
            metadata: {
              format: value.format as
                | SportFormat.SINGLES
                | SportFormat.DOUBLES,
              ...(value.bestOf !== undefined && { bestOf: value.bestOf }),
              ...(value.pointsPerGame !== undefined && {
                pointsPerGame: value.pointsPerGame,
              }),
              ...(value.winByTwo !== undefined && {
                winByTwo: value.winByTwo,
              }),
              ...(value.scoringType !== undefined && {
                scoringType: value.scoringType,
              }),
            },
          };
        } else {
          input = {
            sportType: SportType.TENNIS,
            startDate: value.startDate.toISOString(),
            visibility: value.visibility,
            statEntryMode: value.statEntryMode,
            metadata: {
              format: value.format as
                | SportFormat.SINGLES
                | SportFormat.DOUBLES,
              ...(value.bestOf !== undefined && { bestOf: value.bestOf }),
              ...(value.tiebreakFinalSet !== undefined && {
                tiebreakFinalSet: value.tiebreakFinalSet,
              }),
            },
          };
        }

        if (value.location) {
          input = {
            ...input,
            location: {
              address: value.location.address,
              ...(value.location.coordinates && {
                coordinates: value.location.coordinates,
              }),
            },
          };
        }

        const result = await createGame(input);

        if (result.success && result.gameId) {
          toast.success(t("game.success.created"));
          router.push(`/game/${result.gameId}`);
          onSuccess?.();
        } else {
          setError(result.message || t("game.errors.createError"));
          toast.error(result.message || t("game.errors.createError"));
        }
      });
    },
  });

  const selectedSportType = useStore(form.store, (s) => s.values.sportType);

  const availableFormats =
    selectedSportType && selectedSportType in SportType
      ? getFormats(selectedSportType)
      : [];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.Field
        name="sportType"
        listeners={{
          onChange: () => {
            form.setFieldValue("format", undefined as unknown as SportFormat);
          },
        }}
      >
        {(field) => (
          <FormComboboxField
            field={field}
            label={t("game.form.sportType")}
            required
            disabled={isPending}
            placeholder={t("game.form.selectSport")}
            options={sportTypeOptions.map((sport) => ({
              value: sport,
              label: t(`sports.${sport}`),
            }))}
          />
        )}
      </form.Field>

      {availableFormats.length > 0 && (
        <form.Field name="format">
          {(field) => (
            <FormComboboxField
              field={field}
              label={t("game.form.sportFormat")}
              required
              disabled={isPending || !selectedSportType}
              placeholder={t("game.form.selectFormat")}
              options={availableFormats.map((fmt) => ({
                value: fmt,
                label: t(`sportFormats.${fmt}`),
              }))}
            />
          )}
        </form.Field>
      )}

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
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            disabled={isPending}
          />
        )}
      </form.Field>

      <form.Field name="statEntryMode">
        {(field) => (
          <StatEntryModeRadioGroup
            value={field.state.value}
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
              onSelect={(loc) => field.handleChange(loc)}
              onClear={() => field.handleChange(undefined)}
              disabled={isPending}
            />
          </Field>
        )}
      </form.Field>

      {selectedSportType && (
        <Collapsible>
          <CollapsibleTrigger
            render={<Button variant="link" type="button" className="px-0" />}
          >
            {t("game.form.advancedOptions")}
            <ChevronDown className="ml-1 h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            {(selectedSportType === SportType.BASKETBALL ||
              selectedSportType === SportType.FOOTBALL) && (
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

            {selectedSportType === SportType.TENNIS && (
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

            {selectedSportType === SportType.PICKLEBALL && (
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
                        items={[
                          { value: PickleballScoringType.RALLY, label: t("game.metadata.scoringType.RALLY") },
                          { value: PickleballScoringType.SIDE_OUT, label: t("game.metadata.scoringType.SIDE_OUT") },
                        ]}
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

            {selectedSportType === SportType.BASEBALL && (
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
      )}

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? t("game.actions.saving") : t("game.actions.create")}
        </Button>
      </div>
    </form>
  );
}
