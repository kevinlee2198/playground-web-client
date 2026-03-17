"use client";

import { savePickleballStatistics } from "@/app/[locale]/game/pickleball-stats-actions";
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
  PickleballStatisticsNode,
  SavePickleballStatisticsInput,
} from "@/lib/types/stats/pickleball";
import { nullToUndefined, undefinedToNull } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface PickleballStatsFormProps {
  gameId: number;
  initialData: PickleballStatisticsNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PickleballStatsForm({
  gameId,
  initialData,
  open,
  onOpenChange,
}: PickleballStatsFormProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      aces: nullToUndefined(initialData.aces),
      faults: nullToUndefined(initialData.faults),
      doubleFaults: nullToUndefined(initialData.doubleFaults),
      pointsWon: nullToUndefined(initialData.pointsWon),
      winners: nullToUndefined(initialData.winners),
      unforcedErrors: nullToUndefined(initialData.unforcedErrors),
      forcedErrors: nullToUndefined(initialData.forcedErrors),
      dinks: nullToUndefined(initialData.dinks),
      drives: nullToUndefined(initialData.drives),
      drops: nullToUndefined(initialData.drops),
      lobs: nullToUndefined(initialData.lobs),
      volleys: nullToUndefined(initialData.volleys),
      overheads: nullToUndefined(initialData.overheads),
    },
    onSubmit: async ({ value }) => {
      setError(null);

      startTransition(async () => {
        const input: SavePickleballStatisticsInput = {
          playerId: initialData.player.id,
          gameId,
          aces: undefinedToNull(value.aces),
          faults: undefinedToNull(value.faults),
          doubleFaults: undefinedToNull(value.doubleFaults),
          pointsWon: undefinedToNull(value.pointsWon),
          winners: undefinedToNull(value.winners),
          unforcedErrors: undefinedToNull(value.unforcedErrors),
          forcedErrors: undefinedToNull(value.forcedErrors),
          dinks: undefinedToNull(value.dinks),
          drives: undefinedToNull(value.drives),
          drops: undefinedToNull(value.drops),
          lobs: undefinedToNull(value.lobs),
          volleys: undefinedToNull(value.volleys),
          overheads: undefinedToNull(value.overheads),
        };

        const result = await savePickleballStatistics(input);

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
          <FieldGroup className="sm:grid sm:grid-cols-2">
            <form.Field name="aces">
              {(field) => (
                <FormTextField field={field} label={t("game.boxScore.pickleball.aces")} type="number" disabled={isPending} placeholder="0" />
              )}
            </form.Field>
            <form.Field name="faults">
              {(field) => (
                <FormTextField field={field} label={t("game.boxScore.pickleball.faults")} type="number" disabled={isPending} placeholder="0" />
              )}
            </form.Field>
            <form.Field name="doubleFaults">
              {(field) => (
                <FormTextField field={field} label={t("game.boxScore.pickleball.doubleFaults")} type="number" disabled={isPending} placeholder="0" />
              )}
            </form.Field>
            <form.Field name="pointsWon">
              {(field) => (
                <FormTextField field={field} label={t("game.boxScore.pickleball.pointsWon")} type="number" disabled={isPending} placeholder="0" />
              )}
            </form.Field>
            <form.Field name="winners">
              {(field) => (
                <FormTextField field={field} label={t("game.boxScore.pickleball.winners")} type="number" disabled={isPending} placeholder="0" />
              )}
            </form.Field>
            <form.Field name="unforcedErrors">
              {(field) => (
                <FormTextField field={field} label={t("game.boxScore.pickleball.unforcedErrors")} type="number" disabled={isPending} placeholder="0" />
              )}
            </form.Field>
            <form.Field name="forcedErrors">
              {(field) => (
                <FormTextField field={field} label={t("game.boxScore.pickleball.forcedErrors")} type="number" disabled={isPending} placeholder="0" />
              )}
            </form.Field>
            <form.Field name="dinks">
              {(field) => (
                <FormTextField field={field} label={t("game.boxScore.pickleball.dinks")} type="number" disabled={isPending} placeholder="0" />
              )}
            </form.Field>
            <form.Field name="drives">
              {(field) => (
                <FormTextField field={field} label={t("game.boxScore.pickleball.drives")} type="number" disabled={isPending} placeholder="0" />
              )}
            </form.Field>
            <form.Field name="drops">
              {(field) => (
                <FormTextField field={field} label={t("game.boxScore.pickleball.drops")} type="number" disabled={isPending} placeholder="0" />
              )}
            </form.Field>
            <form.Field name="lobs">
              {(field) => (
                <FormTextField field={field} label={t("game.boxScore.pickleball.lobs")} type="number" disabled={isPending} placeholder="0" />
              )}
            </form.Field>
            <form.Field name="volleys">
              {(field) => (
                <FormTextField field={field} label={t("game.boxScore.pickleball.volleys")} type="number" disabled={isPending} placeholder="0" />
              )}
            </form.Field>
            <form.Field name="overheads">
              {(field) => (
                <FormTextField field={field} label={t("game.boxScore.pickleball.overheads")} type="number" disabled={isPending} placeholder="0" />
              )}
            </form.Field>
          </FieldGroup>

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
