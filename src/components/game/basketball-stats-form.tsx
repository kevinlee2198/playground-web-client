"use client";

import { saveBasketballStats } from "@/app/[locale]/game/basketball-stats-actions";
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
  BasketballStatsNode,
  SaveBasketballStatsInput,
} from "@/lib/types/stats/basketball";
import { nullToUndefined, undefinedToNull } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

interface BasketballStatsFormProps {
  gameId: number;
  initialData: BasketballStatsNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BasketballStatsForm({
  gameId,
  initialData,
  open,
  onOpenChange,
}: BasketballStatsFormProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      assists: nullToUndefined(initialData.assists),
      steals: nullToUndefined(initialData.steals),
      blocks: nullToUndefined(initialData.blocks),
      turnovers: nullToUndefined(initialData.turnovers),
      personalFouls: nullToUndefined(initialData.personalFouls),
      offensiveRebounds: nullToUndefined(initialData.offensiveRebounds),
      defensiveRebounds: nullToUndefined(initialData.defensiveRebounds),
      threePointersMade: nullToUndefined(initialData.threePointersMade),
      threePointersAttempted: nullToUndefined(
        initialData.threePointersAttempted,
      ),
      twoPointersMade: nullToUndefined(initialData.twoPointersMade),
      twoPointersAttempted: nullToUndefined(initialData.twoPointersAttempted),
      freeThrowsMade: nullToUndefined(initialData.freeThrowsMade),
      freeThrowsAttempted: nullToUndefined(initialData.freeThrowsAttempted),
    },
    onSubmit: async ({ value }) => {
      setError(null);

      // Validate made <= attempted
      if (
        value.threePointersMade != null &&
        value.threePointersAttempted != null &&
        value.threePointersMade > value.threePointersAttempted
      ) {
        setError("3PT made cannot exceed attempted");
        return;
      }
      if (
        value.twoPointersMade != null &&
        value.twoPointersAttempted != null &&
        value.twoPointersMade > value.twoPointersAttempted
      ) {
        setError("2PT made cannot exceed attempted");
        return;
      }
      if (
        value.freeThrowsMade != null &&
        value.freeThrowsAttempted != null &&
        value.freeThrowsMade > value.freeThrowsAttempted
      ) {
        setError("FT made cannot exceed attempted");
        return;
      }

      startTransition(async () => {
        const input: SaveBasketballStatsInput = {
          userId: initialData.user.id,
          gameId,
          assists: undefinedToNull(value.assists),
          steals: undefinedToNull(value.steals),
          blocks: undefinedToNull(value.blocks),
          turnovers: undefinedToNull(value.turnovers),
          personalFouls: undefinedToNull(value.personalFouls),
          offensiveRebounds: undefinedToNull(value.offensiveRebounds),
          defensiveRebounds: undefinedToNull(value.defensiveRebounds),
          threePointersMade: undefinedToNull(value.threePointersMade),
          threePointersAttempted: undefinedToNull(value.threePointersAttempted),
          twoPointersMade: undefinedToNull(value.twoPointersMade),
          twoPointersAttempted: undefinedToNull(value.twoPointersAttempted),
          freeThrowsMade: undefinedToNull(value.freeThrowsMade),
          freeThrowsAttempted: undefinedToNull(value.freeThrowsAttempted),
        };

        const result = await saveBasketballStats(input);

        if (result.success) {
          toast.add({ title: t("game.success.statsSaved"), type: "success" });
          onOpenChange(false);
        } else {
          setError(result.message || t("game.errors.statsError"));
          toast.add({ title: result.message || t("game.errors.statsError"), type: "error" });
        }
      });
    },
  });

  const userName = initialData.user.displayName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("game.stats.editStats")} - {userName}
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
            <form.Field name="assists">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.stats.basketball.assists")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="steals">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.stats.basketball.steals")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="blocks">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.stats.basketball.blocks")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="turnovers">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.stats.basketball.turnovers")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="personalFouls">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.stats.basketball.personalFouls")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="offensiveRebounds">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.stats.basketball.offensiveRebounds")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>

            <form.Field name="defensiveRebounds">
              {(field) => (
                <FormTextField
                  field={field}
                  label={t("game.stats.basketball.defensiveRebounds")}
                  type="number"
                  disabled={isPending}
                  placeholder="0"
                />
              )}
            </form.Field>
          </FieldGroup>

          {/* Three Pointers */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              {t("game.stats.basketball.threePointers")}
            </h4>
            <FieldGroup className="sm:grid sm:grid-cols-2">
              <form.Field name="threePointersMade">
                {(field) => (
                  <FormTextField
                    field={field}
                    label="Made"
                    type="number"
                    disabled={isPending}
                    placeholder="0"
                  />
                )}
              </form.Field>
              <form.Field name="threePointersAttempted">
                {(field) => (
                  <FormTextField
                    field={field}
                    label="Attempted"
                    type="number"
                    disabled={isPending}
                    placeholder="0"
                  />
                )}
              </form.Field>
            </FieldGroup>
          </div>

          {/* Two Pointers */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              {t("game.stats.basketball.twoPointers")}
            </h4>
            <FieldGroup className="sm:grid sm:grid-cols-2">
              <form.Field name="twoPointersMade">
                {(field) => (
                  <FormTextField
                    field={field}
                    label="Made"
                    type="number"
                    disabled={isPending}
                    placeholder="0"
                  />
                )}
              </form.Field>
              <form.Field name="twoPointersAttempted">
                {(field) => (
                  <FormTextField
                    field={field}
                    label="Attempted"
                    type="number"
                    disabled={isPending}
                    placeholder="0"
                  />
                )}
              </form.Field>
            </FieldGroup>
          </div>

          {/* Free Throws */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              {t("game.stats.basketball.freeThrows")}
            </h4>
            <FieldGroup className="sm:grid sm:grid-cols-2">
              <form.Field name="freeThrowsMade">
                {(field) => (
                  <FormTextField
                    field={field}
                    label="Made"
                    type="number"
                    disabled={isPending}
                    placeholder="0"
                  />
                )}
              </form.Field>
              <form.Field name="freeThrowsAttempted">
                {(field) => (
                  <FormTextField
                    field={field}
                    label="Attempted"
                    type="number"
                    disabled={isPending}
                    placeholder="0"
                  />
                )}
              </form.Field>
            </FieldGroup>
          </div>

          {error && (
            <div role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3">
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
