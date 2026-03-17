"use client";

import { saveFootballOffensiveStats } from "@/app/[locale]/game/football-stats-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { FormTextField } from "@/components/ui/form-field";
import type {
  FootballOffensiveStatsNode,
  SaveFootballOffensiveStatsInput,
} from "@/lib/types/stats/football";
import { nullToUndefined, undefinedToNull } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const STAT_FIELDS = [
  "completions",
  "passAttempts",
  "passingYards",
  "passingTouchdowns",
  "interceptionsThrown",
  "sacksTaken",
  "sackYardsLost",
  "rushAttempts",
  "rushingYards",
  "rushingTouchdowns",
  "fumbles",
  "fumblesLost",
  "receptions",
  "targets",
  "receivingYards",
  "receivingTouchdowns",
] as const;

type StatField = (typeof STAT_FIELDS)[number];

const PASSING_FIELDS = [
  "completions",
  "passAttempts",
  "passingYards",
  "passingTouchdowns",
  "interceptionsThrown",
  "sacksTaken",
  "sackYardsLost",
] as const satisfies readonly StatField[];

const RUSHING_FIELDS = [
  "rushAttempts",
  "rushingYards",
  "rushingTouchdowns",
  "fumbles",
  "fumblesLost",
] as const satisfies readonly StatField[];

const RECEIVING_FIELDS = [
  "receptions",
  "targets",
  "receivingYards",
  "receivingTouchdowns",
] as const satisfies readonly StatField[];

interface FootballOffensiveStatsFormProps {
  gameId: number;
  initialData: FootballOffensiveStatsNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildDefaultValues(
  data: FootballOffensiveStatsNode,
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
): SaveFootballOffensiveStatsInput {
  const input: SaveFootballOffensiveStatsInput = { playerId, gameId };
  for (const field of STAT_FIELDS) {
    input[field] = undefinedToNull(value[field]);
  }
  return input;
}

export function FootballOffensiveStatsForm({
  gameId,
  initialData,
  open,
  onOpenChange,
}: FootballOffensiveStatsFormProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: buildDefaultValues(initialData),
    onSubmit: async ({ value }) => {
      setError(null);

      startTransition(async () => {
        const input = buildInput(value, initialData.player.id, gameId);
        const result = await saveFootballOffensiveStats(input);

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
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">
              {t("game.boxScore.football.sections.passing")}
            </h4>
            <FieldGroup className="sm:grid sm:grid-cols-2">
              {PASSING_FIELDS.map((field) => (
                <form.Field key={field} name={field}>
                  {(fieldApi) => (
                    <FormTextField
                      field={fieldApi}
                      label={t(`game.boxScore.football.offensive.${field}`)}
                      type="number"
                      disabled={isPending}
                      placeholder="0"
                    />
                  )}
                </form.Field>
              ))}
            </FieldGroup>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">
              {t("game.boxScore.football.sections.rushing")}
            </h4>
            <FieldGroup className="sm:grid sm:grid-cols-2">
              {RUSHING_FIELDS.map((field) => (
                <form.Field key={field} name={field}>
                  {(fieldApi) => (
                    <FormTextField
                      field={fieldApi}
                      label={t(`game.boxScore.football.offensive.${field}`)}
                      type="number"
                      disabled={isPending}
                      placeholder="0"
                    />
                  )}
                </form.Field>
              ))}
            </FieldGroup>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">
              {t("game.boxScore.football.sections.receiving")}
            </h4>
            <FieldGroup className="sm:grid sm:grid-cols-2">
              {RECEIVING_FIELDS.map((field) => (
                <form.Field key={field} name={field}>
                  {(fieldApi) => (
                    <FormTextField
                      field={fieldApi}
                      label={t(`game.boxScore.football.offensive.${field}`)}
                      type="number"
                      disabled={isPending}
                      placeholder="0"
                    />
                  )}
                </form.Field>
              ))}
            </FieldGroup>
          </div>

          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
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
