"use client";

import { saveFootballDefensiveStats } from "@/app/[locale]/game/football-stats-actions";
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
  FootballDefensiveStatsNode,
  SaveFootballDefensiveStatsInput,
} from "@/lib/types/stats/football";
import { nullToUndefined, undefinedToNull } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const STAT_FIELDS = [
  "soloTackles",
  "assistedTackles",
  "sacks",
  "tacklesForLoss",
  "passesDefended",
  "interceptions",
  "interceptionReturnYards",
  "interceptionReturnTouchdowns",
  "forcedFumbles",
  "fumbleRecoveries",
  "fumbleReturnYards",
  "fumbleReturnTouchdowns",
  "safeties",
] as const;

type StatField = (typeof STAT_FIELDS)[number];

interface FootballDefensiveStatsFormProps {
  gameId: number;
  initialData: FootballDefensiveStatsNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildDefaultValues(
  data: FootballDefensiveStatsNode,
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
): SaveFootballDefensiveStatsInput {
  const input: SaveFootballDefensiveStatsInput = { playerId, gameId };
  for (const field of STAT_FIELDS) {
    input[field] = undefinedToNull(value[field]);
  }
  return input;
}

export function FootballDefensiveStatsForm({
  gameId,
  initialData,
  open,
  onOpenChange,
}: FootballDefensiveStatsFormProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: buildDefaultValues(initialData),
    onSubmit: async ({ value }) => {
      setError(null);

      startTransition(async () => {
        const input = buildInput(value, initialData.player.id, gameId);
        const result = await saveFootballDefensiveStats(input);

        if (result.success) {
          toast.success(t("game.success.statsSaved"));
          onOpenChange(false);
        } else {
          setError(result.message || t("game.errors.statsError"));
          toast.error(result.message || t("game.errors.statsError"));
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
            {t("game.stats.editBoxScores")} - {playerName}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <FieldGroup className="sm:grid sm:grid-cols-2">
            {STAT_FIELDS.map((field) => (
              <form.Field key={field} name={field}>
                {(fieldApi) => (
                  <FormTextField
                    field={fieldApi}
                    label={t(`game.stats.football.defensive.${field}`)}
                    type="number"
                    disabled={isPending}
                    placeholder="0"
                  />
                )}
              </form.Field>
            ))}
          </FieldGroup>

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
