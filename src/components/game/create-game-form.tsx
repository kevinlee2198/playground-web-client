"use client";

import { createGame } from "@/app/[locale]/game/actions";
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
import { getSubtypes, SportSubtype, SportType } from "@/lib/constants";
import type { CreateGameInput } from "@/lib/types/game";
import { useForm, useStore } from "@tanstack/react-form";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createGameFormSchema } from "./game-form-fields";

const sportTypeOptions = Object.values(SportType);

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
      subtype: undefined as unknown as SportSubtype,
      startDate: new Date(),
      periods: undefined as number | undefined,
      bestOf: undefined as number | undefined,
      tiebreakFinalSet: undefined as boolean | undefined,
    },
    validators: {
      onBlur: ({ value }) => {
        const result = createGameFormSchema.safeParse(value);
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
        const sportType = value.sportType;

        let input: CreateGameInput;

        if (sportType === SportType.BASKETBALL) {
          input = {
            sportType: SportType.BASKETBALL,
            startDate: value.startDate.toISOString(),
            metadata: {
              subtype: value.subtype as
                | SportSubtype.FIVE_ON_FIVE
                | SportSubtype.THREE_ON_THREE,
              ...(value.periods !== undefined && { periods: value.periods }),
            },
          };
        } else if (sportType === SportType.FOOTBALL) {
          input = {
            sportType: SportType.FOOTBALL,
            startDate: value.startDate.toISOString(),
            metadata: {
              subtype: value.subtype as
                | SportSubtype.FLAG_FOOTBALL
                | SportSubtype.AMERICAN_FOOTBALL,
              ...(value.periods !== undefined && { periods: value.periods }),
            },
          };
        } else {
          input = {
            sportType: SportType.TENNIS,
            startDate: value.startDate.toISOString(),
            metadata: {
              subtype: value.subtype as
                | SportSubtype.SINGLES
                | SportSubtype.DOUBLES,
              ...(value.bestOf !== undefined && { bestOf: value.bestOf }),
              ...(value.tiebreakFinalSet !== undefined && {
                tiebreakFinalSet: value.tiebreakFinalSet,
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
          setError(result.error || t("game.errors.createError"));
          toast.error(result.error || t("game.errors.createError"));
        }
      });
    },
  });

  const selectedSportType = useStore(form.store, (s) => s.values.sportType);

  const availableSubtypes =
    selectedSportType && selectedSportType in SportType
      ? getSubtypes(selectedSportType)
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
            form.setFieldValue("subtype", undefined as unknown as SportSubtype);
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

      <form.Field name="subtype">
        {(field) => (
          <FormComboboxField
            field={field}
            label={t("game.form.sportSubtype")}
            required
            disabled={isPending || !selectedSportType}
            placeholder={t("game.form.selectFormat")}
            options={availableSubtypes.map((subtype) => ({
              value: subtype,
              label: t(`sportSubtypes.${subtype}`),
            }))}
          />
        )}
      </form.Field>

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
