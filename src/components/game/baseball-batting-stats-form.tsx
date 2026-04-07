"use client";

import { saveBaseballBattingStats } from "@/app/[locale]/game/baseball-stats-actions";
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
  BaseballBattingStatsNode,
  SaveBaseballBattingStatsInput,
} from "@/lib/types/stats/baseball";
import { nullToUndefined, undefinedToNull } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface BaseballBattingStatsFormProps {
  gameId: number;
  initialData: BaseballBattingStatsNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BaseballBattingStatsForm({
  gameId,
  initialData,
  open,
  onOpenChange,
}: BaseballBattingStatsFormProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      atBats: nullToUndefined(initialData.atBats),
      runs: nullToUndefined(initialData.runs),
      hits: nullToUndefined(initialData.hits),
      doubles: nullToUndefined(initialData.doubles),
      triples: nullToUndefined(initialData.triples),
      homeRuns: nullToUndefined(initialData.homeRuns),
      rbi: nullToUndefined(initialData.rbi),
      walks: nullToUndefined(initialData.walks),
      strikeouts: nullToUndefined(initialData.strikeouts),
      stolenBases: nullToUndefined(initialData.stolenBases),
      caughtStealing: nullToUndefined(initialData.caughtStealing),
      hitByPitch: nullToUndefined(initialData.hitByPitch),
      sacrifices: nullToUndefined(initialData.sacrifices),
    },
    onSubmit: async ({ value }) => {
      setError(null);

      startTransition(async () => {
        const input: SaveBaseballBattingStatsInput = {
          playerId: initialData.player.id,
          gameId,
          atBats: undefinedToNull(value.atBats),
          runs: undefinedToNull(value.runs),
          hits: undefinedToNull(value.hits),
          doubles: undefinedToNull(value.doubles),
          triples: undefinedToNull(value.triples),
          homeRuns: undefinedToNull(value.homeRuns),
          rbi: undefinedToNull(value.rbi),
          walks: undefinedToNull(value.walks),
          strikeouts: undefinedToNull(value.strikeouts),
          stolenBases: undefinedToNull(value.stolenBases),
          caughtStealing: undefinedToNull(value.caughtStealing),
          hitByPitch: undefinedToNull(value.hitByPitch),
          sacrifices: undefinedToNull(value.sacrifices),
        };

        const result = await saveBaseballBattingStats(input);

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
            {t("game.stats.editStats")} - {playerName}
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
            <form.Field name="atBats">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.stats.baseball.batting.atBats")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="runs">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.stats.baseball.batting.runs")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="hits">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.stats.baseball.batting.hits")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="doubles">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.stats.baseball.batting.doubles")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="triples">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.stats.baseball.batting.triples")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="homeRuns">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.stats.baseball.batting.homeRuns")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="rbi">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.stats.baseball.batting.rbi")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="walks">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.stats.baseball.batting.walks")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="strikeouts">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.stats.baseball.batting.strikeouts")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="stolenBases">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.stats.baseball.batting.stolenBases")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="caughtStealing">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.stats.baseball.batting.caughtStealing")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="hitByPitch">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.stats.baseball.batting.hitByPitch")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="sacrifices">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.stats.baseball.batting.sacrifices")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>
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
