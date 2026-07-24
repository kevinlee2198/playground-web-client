"use client";

import { updateParticipantScores } from "@/app/[locale]/game/participant-actions";
import { Button } from "@/components/ui/button";
import { FormTextField } from "@/components/ui/form-field";
import { SportType } from "@/lib/constants";
import type {
  GameParticipantDetail,
  UpdateParticipantScoreEntry,
} from "@/lib/types/game";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";
import { z } from "zod";

interface BasketballScoreFormProps {
  sportType: SportType.BASKETBALL;
  participantA: GameParticipantDetail;
  participantB: GameParticipantDetail;
  nameA: string;
  nameB: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const basketballScoreSchema = z.object({
  scoreA: z
    .number()
    .int("Must be a whole number")
    .min(0, "Must be non-negative"),
  scoreB: z
    .number()
    .int("Must be a whole number")
    .min(0, "Must be non-negative"),
});

function extractScore(participant: GameParticipantDetail): number {
  const metadata = participant.metadata;
  if (metadata?.__typename === "BasketballParticipantMetadata") {
    return metadata.score;
  }
  return 0;
}

export function BasketballScoreForm({
  participantA,
  participantB,
  nameA,
  nameB,
  onSuccess,
  onCancel,
}: BasketballScoreFormProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      scoreA: extractScore(participantA),
      scoreB: extractScore(participantB),
    },
    validators: {
      onBlur: ({ value }) => {
        const result = basketballScoreSchema.safeParse(value);
        if (result.success) return undefined;
        return result.error.issues.map((issue) => ({
          message: issue.message,
          path: issue.path,
        }));
      },
      onSubmit: ({ value }) => {
        const result = basketballScoreSchema.safeParse(value);
        if (result.success) return undefined;
        return result.error.issues.map((issue) => ({
          message: issue.message,
          path: issue.path,
        }));
      },
    },
    onSubmit: async ({ value }) => {
      setError(null);

      const isTeam = participantA.__typename === "TeamInstance";
      const entries: UpdateParticipantScoreEntry[] = [
        {
          id: participantA.id,
          isTeam,
          metadata: { basketball: { score: value.scoreA } },
        },
        {
          id: participantB.id,
          isTeam,
          metadata: { basketball: { score: value.scoreB } },
        },
      ];

      startTransition(async () => {
        const result = await updateParticipantScores(entries);
        if (result.success) {
          toast.add({ title: t("game.scoreboard.scoreUpdated"), type: "success" });
          onSuccess();
        } else {
          const errorMsg =
            result.message || t("game.scoreboard.scoreUpdateError");
          setError(errorMsg);
          toast.add({ title: errorMsg, type: "error" });
        }
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <form.Field name="scoreA">
            {(field) => (
              <FormTextField
                field={field}
                label={nameA}
                type="number"
                disabled={isPending}
                placeholder="0"
              />
            )}
          </form.Field>
        </div>
        <div className="flex-1">
          <form.Field name="scoreB">
            {(field) => (
              <FormTextField
                field={field}
                label={nameB}
                type="number"
                disabled={isPending}
                placeholder="0"
              />
            )}
          </form.Field>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          {t("game.scoreboard.cancel")}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? t("game.scoreboard.saving") : t("game.scoreboard.save")}
        </Button>
      </div>
    </form>
  );
}
