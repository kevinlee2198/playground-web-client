"use client";

import { saveTennisStatistics } from "@/app/[locale]/game/tennis-stats-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { FormTextField } from "@/components/ui/form-field";
import { TypographySmall } from "@/components/ui/typography";
import type {
  TennisStatisticsNode,
  SaveTennisStatisticsInput,
} from "@/lib/types/stats/tennis";
import { nullToUndefined, undefinedToNull } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const SERVING_FIELDS = [
  "aces",
  "doubleFaults",
  "firstServesIn",
  "firstServeAttempts",
  "firstServePointsWon",
  "firstServePointsPlayed",
  "secondServePointsWon",
  "secondServePointsPlayed",
] as const;

const RETURNING_FIELDS = [
  "breakPointsConverted",
  "breakPointsFaced",
  "returnPointsWon",
  "returnPointsPlayed",
] as const;

const GENERAL_FIELDS = [
  "winners",
  "unforcedErrors",
  "totalPointsWon",
] as const;

const STAT_FIELDS = [
  ...SERVING_FIELDS,
  ...RETURNING_FIELDS,
  ...GENERAL_FIELDS,
] as const;

type StatField = (typeof STAT_FIELDS)[number];

interface TennisStatsFormProps {
  gameId: number;
  initialData: TennisStatisticsNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildDefaultValues(
  data: TennisStatisticsNode,
): Record<StatField, number | undefined> {
  const result = {} as Record<StatField, number | undefined>;
  for (const field of STAT_FIELDS) {
    result[field] = nullToUndefined(data[field]);
  }
  return result;
}

function buildInput(
  value: Record<StatField, number | undefined>,
  playerId: number,
  gameId: number,
): SaveTennisStatisticsInput {
  const input: SaveTennisStatisticsInput = { playerId, gameId };
  for (const field of STAT_FIELDS) {
    input[field] = undefinedToNull(value[field]);
  }
  return input;
}

export function TennisStatsForm({
  gameId,
  initialData,
  open,
  onOpenChange,
}: TennisStatsFormProps) {
  const t = useTranslations();
  const tennisT = useTranslations("game.boxScore.tennis");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: buildDefaultValues(initialData),
    onSubmit: async ({ value }) => {
      setError(null);

      startTransition(async () => {
        const input = buildInput(value, initialData.player.id, gameId);
        const result = await saveTennisStatistics(input);

        if (result.success) {
          toast.success(t("game.success.boxScoresSaved"));
          onOpenChange(false);
        } else {
          setError(result.message || t("game.errors.boxScoreError"));
          toast.error(result.message || t("game.errors.boxScoreError"));
        }
      });
    },
  });

  const playerName = initialData.player.user.displayName;

  function renderFieldGroup(fields: readonly StatField[]) {
    return (
      <FieldGroup className="sm:grid sm:grid-cols-2">
        {fields.map((field) => (
          <form.Field key={field} name={field}>
            {(fieldApi) => (
              <FormTextField
                field={fieldApi}
                label={tennisT(field)}
                type="number"
                disabled={isPending}
                placeholder="0"
              />
            )}
          </form.Field>
        ))}
      </FieldGroup>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("game.boxScore.editBoxScores")} - {playerName}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <TypographySmall>{tennisT("sections.serving")}</TypographySmall>
            {renderFieldGroup(SERVING_FIELDS)}
          </div>

          <div className="space-y-2">
            <TypographySmall>{tennisT("sections.returning")}</TypographySmall>
            {renderFieldGroup(RETURNING_FIELDS)}
          </div>

          <div className="space-y-2">
            <TypographySmall>{tennisT("sections.general")}</TypographySmall>
            {renderFieldGroup(GENERAL_FIELDS)}
          </div>

          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("game.actions.saving") : t("actions.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
