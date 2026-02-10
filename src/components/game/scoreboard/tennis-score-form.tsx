"use client";

import { updateParticipantScores } from "@/app/[locale]/game/participant-actions";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { toFieldErrors } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  GameParticipantDetail,
  UpdateParticipantScoreEntry,
} from "@/lib/types/game";
import { useForm } from "@tanstack/react-form";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { z } from "zod";

interface TennisScoreFormProps {
  participantA: GameParticipantDetail;
  participantB: GameParticipantDetail;
  nameA: string;
  nameB: string;
  bestOf: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const tennisSetSchema = z
  .object({
    gamesWonA: z
      .number()
      .int("Must be a whole number")
      .min(0, "Must be non-negative")
      .max(7, "Cannot exceed 7"),
    gamesWonB: z
      .number()
      .int("Must be a whole number")
      .min(0, "Must be non-negative")
      .max(7, "Cannot exceed 7"),
    tiebreakPointsA: z
      .number()
      .int("Must be a whole number")
      .min(0, "Must be non-negative")
      .nullable(),
    tiebreakPointsB: z
      .number()
      .int("Must be a whole number")
      .min(0, "Must be non-negative")
      .nullable(),
  })
  .refine(
    (data) => {
      // Tiebreak validation: only on 7-6 or 6-7 sets
      const is76 = data.gamesWonA === 7 && data.gamesWonB === 6;
      const is67 = data.gamesWonA === 6 && data.gamesWonB === 7;

      if (!is76 && !is67) {
        // No tiebreak allowed
        return data.tiebreakPointsA === null && data.tiebreakPointsB === null;
      }

      // On a tiebreak set, the losing player (with 6 games) has tiebreak points
      if (is76) {
        return data.tiebreakPointsB !== null && data.tiebreakPointsA === null;
      }
      // is67
      return data.tiebreakPointsA !== null && data.tiebreakPointsB === null;
    },
    {
      message:
        "Tiebreak points only valid on 7-6 sets, assigned to losing player",
    },
  );

const createTennisScoreSchema = (bestOf: number) =>
  z.object({
    sets: z
      .array(tennisSetSchema)
      .min(1, "At least one set required")
      .max(bestOf, `Cannot exceed ${bestOf} sets`),
  });

interface TennisSet {
  gamesWonA: number;
  gamesWonB: number;
  tiebreakPointsA: number | null;
  tiebreakPointsB: number | null;
}

function extractSets(
  participantA: GameParticipantDetail,
  participantB: GameParticipantDetail,
): TennisSet[] {
  const metaA = participantA.metadata;
  const metaB = participantB.metadata;

  if (
    metaA?.__typename === "TennisParticipantMetadata" &&
    metaB?.__typename === "TennisParticipantMetadata"
  ) {
    return metaA.sets.map((setA, i) => ({
      gamesWonA: setA.gamesWon,
      gamesWonB: metaB.sets[i]?.gamesWon ?? 0,
      tiebreakPointsA: setA.tiebreakPoints,
      tiebreakPointsB: metaB.sets[i]?.tiebreakPoints ?? null,
    }));
  }

  return [];
}

export function TennisScoreForm({
  participantA,
  participantB,
  nameA,
  nameB,
  bestOf,
  onSuccess,
  onCancel,
}: TennisScoreFormProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      sets: extractSets(participantA, participantB),
    },
    validators: {
      onBlur: ({ value }) => {
        const result = createTennisScoreSchema(bestOf).safeParse(value);
        if (result.success) return undefined;
        return result.error.issues.map((issue) => ({
          message: issue.message,
          path: issue.path,
        }));
      },
      onSubmit: ({ value }) => {
        const result = createTennisScoreSchema(bestOf).safeParse(value);
        if (result.success) return undefined;
        return result.error.issues.map((issue) => ({
          message: issue.message,
          path: issue.path,
        }));
      },
    },
    onSubmit: async ({ value }) => {
      setError(null);

      // Calculate setsWon for each participant
      const setsWonA = value.sets.filter(
        (s) => s.gamesWonA > s.gamesWonB,
      ).length;
      const setsWonB = value.sets.filter(
        (s) => s.gamesWonB > s.gamesWonA,
      ).length;

      const isTeam = participantA.__typename === "TeamInstance";
      const entries: UpdateParticipantScoreEntry[] = [
        {
          id: participantA.id,
          isTeam,
          metadata: {
            tennis: {
              setsWon: setsWonA,
              sets: value.sets.map((s) => ({
                gamesWon: s.gamesWonA,
                tiebreakPoints: s.tiebreakPointsA ?? undefined,
              })),
            },
          },
        },
        {
          id: participantB.id,
          isTeam,
          metadata: {
            tennis: {
              setsWon: setsWonB,
              sets: value.sets.map((s) => ({
                gamesWon: s.gamesWonB,
                tiebreakPoints: s.tiebreakPointsB ?? undefined,
              })),
            },
          },
        },
      ];

      startTransition(async () => {
        const result = await updateParticipantScores(entries);
        if (result.success) {
          toast.success(t("game.scoreboard.scoreUpdated"));
          onSuccess();
        } else {
          const errorMsg =
            result.error || t("game.scoreboard.scoreUpdateError");
          setError(errorMsg);
          toast.error(errorMsg);
        }
      });
    },
  });

  const handleAddSet = () => {
    const currentSets = form.getFieldValue("sets");
    form.setFieldValue("sets", [
      ...currentSets,
      {
        gamesWonA: 0,
        gamesWonB: 0,
        tiebreakPointsA: null,
        tiebreakPointsB: null,
      },
    ]);
  };

  const handleRemoveSet = (index: number) => {
    const currentSets = form.getFieldValue("sets");
    form.setFieldValue(
      "sets",
      currentSets.filter((_, i) => i !== index),
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.Field name="sets">
        {(field) => (
          <>
            {field.state.value.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                {t("game.scoreboard.noScores")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Player</TableHead>
                      {field.state.value.map((_, i) => (
                        <TableHead key={i} className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {t("game.scoreboard.set")} {i + 1}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSet(i)}
                              disabled={isPending}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">{nameA}</TableCell>
                      {field.state.value.map((set, i) => (
                        <TableCell key={i}>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              max={7}
                              className="w-16"
                              value={set.gamesWonA}
                              onChange={(e) => {
                                const updated = [...field.state.value];
                                updated[i] = {
                                  ...updated[i],
                                  gamesWonA: e.target.value
                                    ? Number(e.target.value)
                                    : 0,
                                };
                                field.handleChange(updated);
                              }}
                              onBlur={field.handleBlur}
                              disabled={isPending}
                            />
                            <Input
                              type="number"
                              min={0}
                              className="w-16"
                              placeholder={t("game.scoreboard.tiebreakPoints")}
                              value={set.tiebreakPointsA ?? ""}
                              onChange={(e) => {
                                const updated = [...field.state.value];
                                updated[i] = {
                                  ...updated[i],
                                  tiebreakPointsA: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                };
                                field.handleChange(updated);
                              }}
                              onBlur={field.handleBlur}
                              disabled={isPending}
                            />
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">{nameB}</TableCell>
                      {field.state.value.map((set, i) => (
                        <TableCell key={i}>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              max={7}
                              className="w-16"
                              value={set.gamesWonB}
                              onChange={(e) => {
                                const updated = [...field.state.value];
                                updated[i] = {
                                  ...updated[i],
                                  gamesWonB: e.target.value
                                    ? Number(e.target.value)
                                    : 0,
                                };
                                field.handleChange(updated);
                              }}
                              onBlur={field.handleBlur}
                              disabled={isPending}
                            />
                            <Input
                              type="number"
                              min={0}
                              className="w-16"
                              placeholder={t("game.scoreboard.tiebreakPoints")}
                              value={set.tiebreakPointsB ?? ""}
                              onChange={(e) => {
                                const updated = [...field.state.value];
                                updated[i] = {
                                  ...updated[i],
                                  tiebreakPointsB: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                };
                                field.handleChange(updated);
                              }}
                              onBlur={field.handleBlur}
                              disabled={isPending}
                            />
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
            {field.state.meta.isTouched && (
              <FieldError errors={toFieldErrors(field.state.meta.errors)} />
            )}
          </>
        )}
      </form.Field>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleAddSet}
          disabled={isPending}
        >
          {t("game.scoreboard.addSet")}
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            {t("game.scoreboard.cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? t("game.scoreboard.saving")
              : t("game.scoreboard.save")}
          </Button>
        </div>
      </div>
    </form>
  );
}
