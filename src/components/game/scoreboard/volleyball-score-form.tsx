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

interface VolleyballScoreFormProps {
  participantA: GameParticipantDetail;
  participantB: GameParticipantDetail;
  nameA: string;
  nameB: string;
  bestOf: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const volleyballSetSchema = z.object({
  pointsScoredA: z
    .number()
    .int("Must be a whole number")
    .min(0, "Must be non-negative"),
  pointsScoredB: z
    .number()
    .int("Must be a whole number")
    .min(0, "Must be non-negative"),
});

const createVolleyballScoreSchema = (bestOf: number) =>
  z.object({
    sets: z
      .array(volleyballSetSchema)
      .min(1, "At least one set required")
      .max(bestOf, `Cannot exceed ${bestOf} sets`),
  });

interface VolleyballSet {
  pointsScoredA: number;
  pointsScoredB: number;
}

function extractSets(
  participantA: GameParticipantDetail,
  participantB: GameParticipantDetail,
): VolleyballSet[] {
  const metaA = participantA.metadata;
  const metaB = participantB.metadata;

  if (
    metaA?.__typename === "VolleyballParticipantMetadata" &&
    metaB?.__typename === "VolleyballParticipantMetadata"
  ) {
    return metaA.sets.map((setA, i) => ({
      pointsScoredA: setA.pointsScored,
      pointsScoredB: metaB.sets[i]?.pointsScored ?? 0,
    }));
  }

  return [];
}

export function VolleyballScoreForm({
  participantA,
  participantB,
  nameA,
  nameB,
  bestOf,
  onSuccess,
  onCancel,
}: VolleyballScoreFormProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const schema = createVolleyballScoreSchema(bestOf);
  const validate = ({ value }: { value: { sets: VolleyballSet[] } }) => {
    const result = schema.safeParse(value);
    if (result.success) return undefined;
    return result.error.issues.map((issue) => ({
      message: issue.message,
      path: issue.path,
    }));
  };

  const form = useForm({
    defaultValues: {
      sets: extractSets(participantA, participantB),
    },
    validators: {
      onBlur: validate,
      onSubmit: validate,
    },
    onSubmit: async ({ value }) => {
      setError(null);

      const setsWonA = value.sets.filter(
        (s) => s.pointsScoredA > s.pointsScoredB,
      ).length;
      const setsWonB = value.sets.filter(
        (s) => s.pointsScoredB > s.pointsScoredA,
      ).length;

      const isTeam = participantA.__typename === "TeamInstance";
      const entries: UpdateParticipantScoreEntry[] = [
        {
          id: participantA.id,
          isTeam,
          metadata: {
            volleyball: {
              setsWon: setsWonA,
              sets: value.sets.map((s) => ({
                pointsScored: s.pointsScoredA,
              })),
            },
          },
        },
        {
          id: participantB.id,
          isTeam,
          metadata: {
            volleyball: {
              setsWon: setsWonB,
              sets: value.sets.map((s) => ({
                pointsScored: s.pointsScoredB,
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
            result.message || t("game.scoreboard.scoreUpdateError");
          setError(errorMsg);
          toast.error(errorMsg);
        }
      });
    },
  });

  function handleAddSet() {
    const currentSets = form.getFieldValue("sets");
    form.setFieldValue("sets", [
      ...currentSets,
      { pointsScoredA: 0, pointsScoredB: 0 },
    ]);
  }

  function handleRemoveSet(index: number) {
    const currentSets = form.getFieldValue("sets");
    form.setFieldValue(
      "sets",
      currentSets.filter((_, i) => i !== index),
    );
  }

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
                      <TableHead className="w-[150px]">{t("game.scoreboard.user")}</TableHead>
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
                          <Input
                            type="number"
                            min={0}
                            className="w-16"
                            value={set.pointsScoredA}
                            onChange={(e) => {
                              const updated = [...field.state.value];
                              updated[i] = {
                                ...updated[i],
                                pointsScoredA: e.target.value
                                  ? Number(e.target.value)
                                  : 0,
                              };
                              field.handleChange(updated);
                            }}
                            onBlur={field.handleBlur}
                            disabled={isPending}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">{nameB}</TableCell>
                      {field.state.value.map((set, i) => (
                        <TableCell key={i}>
                          <Input
                            type="number"
                            min={0}
                            className="w-16"
                            value={set.pointsScoredB}
                            onChange={(e) => {
                              const updated = [...field.state.value];
                              updated[i] = {
                                ...updated[i],
                                pointsScoredB: e.target.value
                                  ? Number(e.target.value)
                                  : 0,
                              };
                              field.handleChange(updated);
                            }}
                            onBlur={field.handleBlur}
                            disabled={isPending}
                          />
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
        <div
          role="alert"
          className="rounded-md border border-destructive bg-destructive/10 p-3"
        >
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
