"use client";

import { saveBaseballPitchingStats } from "@/app/[locale]/game/baseball-stats-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormSwitchField, FormTextField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import type {
  BaseballPitchingStatsNode,
  SaveBaseballPitchingStatsInput,
} from "@/lib/types/stats/baseball";
import { nullToUndefined, undefinedToNull } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface BaseballPitchingStatsFormProps {
  gameId: number;
  initialData: BaseballPitchingStatsNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BaseballPitchingStatsForm({
  gameId,
  initialData,
  open,
  onOpenChange,
}: BaseballPitchingStatsFormProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      inningsPitched: nullToUndefined(initialData.inningsPitched),
      hitsAllowed: nullToUndefined(initialData.hitsAllowed),
      runsAllowed: nullToUndefined(initialData.runsAllowed),
      earnedRuns: nullToUndefined(initialData.earnedRuns),
      walks: nullToUndefined(initialData.walks),
      strikeouts: nullToUndefined(initialData.strikeouts),
      homeRunsAllowed: nullToUndefined(initialData.homeRunsAllowed),
      hitBatsmen: nullToUndefined(initialData.hitBatsmen),
      wildPitches: nullToUndefined(initialData.wildPitches),
      pitchCount: nullToUndefined(initialData.pitchCount),
      win: initialData.win ?? undefined,
      loss: initialData.loss ?? undefined,
      creditedSave: initialData.creditedSave ?? undefined,
    },
    onSubmit: async ({ value }) => {
      setError(null);

      startTransition(async () => {
        const input: SaveBaseballPitchingStatsInput = {
          playerId: initialData.player.id,
          gameId,
          inningsPitched: undefinedToNull(value.inningsPitched),
          hitsAllowed: undefinedToNull(value.hitsAllowed),
          runsAllowed: undefinedToNull(value.runsAllowed),
          earnedRuns: undefinedToNull(value.earnedRuns),
          walks: undefinedToNull(value.walks),
          strikeouts: undefinedToNull(value.strikeouts),
          homeRunsAllowed: undefinedToNull(value.homeRunsAllowed),
          hitBatsmen: undefinedToNull(value.hitBatsmen),
          wildPitches: undefinedToNull(value.wildPitches),
          pitchCount: undefinedToNull(value.pitchCount),
          win: value.win ?? null,
          loss: value.loss ?? null,
          creditedSave: value.creditedSave ?? null,
        };

        const result = await saveBaseballPitchingStats(input);

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
            <form.Field name="inningsPitched">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>
                    {t("game.boxScore.baseball.pitching.inningsPitched")}
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="number"
                    step="0.1"
                    value={field.state.value ?? ""}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      field.handleChange(
                        e.target.value === "" ? undefined : Number(e.target.value),
                      );
                    }}
                    disabled={isPending}
                    placeholder="0"
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="hitsAllowed">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.boxScore.baseball.pitching.hitsAllowed")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="runsAllowed">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.boxScore.baseball.pitching.runsAllowed")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="earnedRuns">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.boxScore.baseball.pitching.earnedRuns")}
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
                  label={t("game.boxScore.baseball.pitching.walks")}
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
                  label={t("game.boxScore.baseball.pitching.strikeouts")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="homeRunsAllowed">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.boxScore.baseball.pitching.homeRunsAllowed")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="hitBatsmen">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.boxScore.baseball.pitching.hitBatsmen")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="wildPitches">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.boxScore.baseball.pitching.wildPitches")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="pitchCount">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.boxScore.baseball.pitching.pitchCount")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>
          </FieldGroup>

          {/* Decision flags */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              {t("game.boxScore.baseball.pitching.decisionFlags")}
            </h4>
            <FieldGroup>
              <form.Field name="win">
                {(field) => (
                  <FormSwitchField
                    field={field}
                    label={t("game.boxScore.baseball.pitching.win")}
                    disabled={isPending}
                  />
                )}
              </form.Field>

              <form.Field name="loss">
                {(field) => (
                  <FormSwitchField
                    field={field}
                    label={t("game.boxScore.baseball.pitching.loss")}
                    disabled={isPending}
                  />
                )}
              </form.Field>

              <form.Field name="creditedSave">
                {(field) => (
                  <FormSwitchField
                    field={field}
                    label={t("game.boxScore.baseball.pitching.creditedSave")}
                    disabled={isPending}
                  />
                )}
              </form.Field>
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
