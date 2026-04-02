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

interface PickleballScoreFormProps {
  participantA: GameParticipantDetail;
  participantB: GameParticipantDetail;
  nameA: string;
  nameB: string;
  bestOf: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const pickleballGameSchema = z.object({
  pointsScoredA: z
    .number()
    .int("Must be a whole number")
    .min(0, "Must be non-negative"),
  pointsScoredB: z
    .number()
    .int("Must be a whole number")
    .min(0, "Must be non-negative"),
});

const createPickleballScoreSchema = (bestOf: number) =>
  z.object({
    games: z
      .array(pickleballGameSchema)
      .min(1, "At least one game required")
      .max(bestOf, `Cannot exceed ${bestOf} games`),
  });

interface PickleballGame {
  pointsScoredA: number;
  pointsScoredB: number;
}

function extractGames(
  participantA: GameParticipantDetail,
  participantB: GameParticipantDetail,
): PickleballGame[] {
  const metaA = participantA.metadata;
  const metaB = participantB.metadata;

  if (
    metaA?.__typename === "PickleballParticipantMetadata" &&
    metaB?.__typename === "PickleballParticipantMetadata"
  ) {
    return metaA.games.map((gameA, i) => ({
      pointsScoredA: gameA.pointsScored,
      pointsScoredB: metaB.games[i]?.pointsScored ?? 0,
    }));
  }

  return [];
}

export function PickleballScoreForm({
  participantA,
  participantB,
  nameA,
  nameB,
  bestOf,
  onSuccess,
  onCancel,
}: PickleballScoreFormProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const schema = createPickleballScoreSchema(bestOf);
  const validate = ({ value }: { value: { games: PickleballGame[] } }) => {
    const result = schema.safeParse(value);
    if (result.success) return undefined;
    return result.error.issues.map((issue) => ({
      message: issue.message,
      path: issue.path,
    }));
  };

  const form = useForm({
    defaultValues: {
      games: extractGames(participantA, participantB),
    },
    validators: {
      onBlur: validate,
      onSubmit: validate,
    },
    onSubmit: async ({ value }) => {
      setError(null);

      const gamesWonA = value.games.filter(
        (g) => g.pointsScoredA > g.pointsScoredB,
      ).length;
      const gamesWonB = value.games.filter(
        (g) => g.pointsScoredB > g.pointsScoredA,
      ).length;

      const isTeam = participantA.__typename === "TeamInstance";
      const entries: UpdateParticipantScoreEntry[] = [
        {
          id: participantA.id,
          isTeam,
          metadata: {
            pickleball: {
              gamesWon: gamesWonA,
              games: value.games.map((g) => ({
                pointsScored: g.pointsScoredA,
              })),
            },
          },
        },
        {
          id: participantB.id,
          isTeam,
          metadata: {
            pickleball: {
              gamesWon: gamesWonB,
              games: value.games.map((g) => ({
                pointsScored: g.pointsScoredB,
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

  function handleAddGame() {
    const currentGames = form.getFieldValue("games");
    form.setFieldValue("games", [
      ...currentGames,
      { pointsScoredA: 0, pointsScoredB: 0 },
    ]);
  }

  function handleRemoveGame(index: number) {
    const currentGames = form.getFieldValue("games");
    form.setFieldValue(
      "games",
      currentGames.filter((_, i) => i !== index),
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
      <form.Field name="games">
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
                      <TableHead className="w-[150px]">{t("game.scoreboard.player")}</TableHead>
                      {field.state.value.map((_, i) => (
                        <TableHead key={i} className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {t("game.scoreboard.game")} {i + 1}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveGame(i)}
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
                      {field.state.value.map((game, i) => (
                        <TableCell key={i}>
                          <Input
                            type="number"
                            min={0}
                            className="w-16"
                            value={game.pointsScoredA}
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
                      {field.state.value.map((game, i) => (
                        <TableCell key={i}>
                          <Input
                            type="number"
                            min={0}
                            className="w-16"
                            value={game.pointsScoredB}
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
        <div role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleAddGame}
          disabled={isPending}
        >
          {t("game.scoreboard.addGame")}
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
