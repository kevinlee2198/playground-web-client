"use client";

import { saveBaseballFieldingStats } from "@/app/[locale]/game/baseball-stats-actions";
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
  BaseballFieldingStatsNode,
  SaveBaseballFieldingStatsInput,
} from "@/lib/types/stats/baseball";
import { nullToUndefined, undefinedToNull } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface BaseballFieldingStatsFormProps {
  gameId: number;
  initialData: BaseballFieldingStatsNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BaseballFieldingStatsForm({
  gameId,
  initialData,
  open,
  onOpenChange,
}: BaseballFieldingStatsFormProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      putouts: nullToUndefined(initialData.putouts),
      assists: nullToUndefined(initialData.assists),
      errors: nullToUndefined(initialData.errors),
    },
    onSubmit: async ({ value }) => {
      setError(null);

      startTransition(async () => {
        const input: SaveBaseballFieldingStatsInput = {
          playerId: initialData.player.id,
          gameId,
          putouts: undefinedToNull(value.putouts),
          assists: undefinedToNull(value.assists),
          errors: undefinedToNull(value.errors),
        };

        const result = await saveBaseballFieldingStats(input);

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
          <FieldGroup>
            <form.Field name="putouts">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.boxScore.baseball.fielding.putouts")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="assists">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.boxScore.baseball.fielding.assists")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="errors">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.boxScore.baseball.fielding.errors")}
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
