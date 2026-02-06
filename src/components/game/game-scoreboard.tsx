"use client";

import { updateParticipantScores } from "@/app/[locale]/game/participant-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GameStatus } from "@/lib/constants";
import type {
  BasketballParticipantMetadata,
  FootballParticipantMetadata,
  GameDetail,
  TennisParticipantMetadata,
  UpdateParticipantScoreEntry,
} from "@/lib/types/game";
import { Pencil, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface GameScoreboardProps {
  game: GameDetail;
}

interface TennisSetScoreInput {
  gamesWon: number;
  tiebreakPoints: number | null;
}

export function GameScoreboard({ game }: GameScoreboardProps) {
  const t = useTranslations();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const participants = game.participants.edges.map((e) => e.node);
  const canEdit =
    game.gameStatus === GameStatus.IN_PROGRESS ||
    game.gameStatus === GameStatus.COMPLETE;

  // Extract participant info
  const participantA = participants[0];
  const participantB = participants[1];

  // Simple scores (basketball/football)
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);

  // Tennis scores
  const [sets, setSets] = useState<
    { playerA: TennisSetScoreInput; playerB: TennisSetScoreInput }[]
  >([]);

  // Initialize edit mode state
  const handleStartEdit = () => {
    if (game.sportType === "BASKETBALL" || game.sportType === "FOOTBALL") {
      const metaA = participantA?.metadata;
      const metaB = participantB?.metadata;
      const initialScoreA =
        metaA?.__typename === "BasketballParticipantMetadata" ||
        metaA?.__typename === "FootballParticipantMetadata"
          ? metaA.score
          : 0;
      const initialScoreB =
        metaB?.__typename === "BasketballParticipantMetadata" ||
        metaB?.__typename === "FootballParticipantMetadata"
          ? metaB.score
          : 0;
      setScoreA(initialScoreA);
      setScoreB(initialScoreB);
    } else if (game.sportType === "TENNIS") {
      const metaA = participantA?.metadata;
      const metaB = participantB?.metadata;

      if (
        metaA?.__typename === "TennisParticipantMetadata" &&
        metaB?.__typename === "TennisParticipantMetadata"
      ) {
        const initialSets = metaA.sets.map((setA, i) => ({
          playerA: {
            gamesWon: setA.gamesWon,
            tiebreakPoints: setA.tiebreakPoints,
          },
          playerB: {
            gamesWon: metaB.sets[i]?.gamesWon ?? 0,
            tiebreakPoints: metaB.sets[i]?.tiebreakPoints ?? null,
          },
        }));
        setSets(initialSets.length > 0 ? initialSets : []);
      } else {
        setSets([]);
      }
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!participantA || !participantB) return;

    const isTeam = participantA.__typename === "TeamInstance";
    const entries: UpdateParticipantScoreEntry[] = [];

    if (game.sportType === "BASKETBALL") {
      entries.push({
        id: participantA.id,
        isTeam,
        metadata: { basketball: { score: scoreA } },
      });
      entries.push({
        id: participantB.id,
        isTeam,
        metadata: { basketball: { score: scoreB } },
      });
    } else if (game.sportType === "FOOTBALL") {
      entries.push({
        id: participantA.id,
        isTeam,
        metadata: { football: { score: scoreA } },
      });
      entries.push({
        id: participantB.id,
        isTeam,
        metadata: { football: { score: scoreB } },
      });
    } else if (game.sportType === "TENNIS") {
      // Compute setsWon
      const setsWonA = sets.filter(
        (s) => s.playerA.gamesWon > s.playerB.gamesWon,
      ).length;
      const setsWonB = sets.filter(
        (s) => s.playerB.gamesWon > s.playerA.gamesWon,
      ).length;

      entries.push({
        id: participantA.id,
        isTeam,
        metadata: {
          tennis: {
            setsWon: setsWonA,
            sets: sets.map((s) => ({
              gamesWon: s.playerA.gamesWon,
              tiebreakPoints: s.playerA.tiebreakPoints ?? undefined,
            })),
          },
        },
      });
      entries.push({
        id: participantB.id,
        isTeam,
        metadata: {
          tennis: {
            setsWon: setsWonB,
            sets: sets.map((s) => ({
              gamesWon: s.playerB.gamesWon,
              tiebreakPoints: s.playerB.tiebreakPoints ?? undefined,
            })),
          },
        },
      });
    }

    startTransition(async () => {
      const result = await updateParticipantScores(entries);
      if (result.success) {
        toast.success(t("game.scoreboard.scoreUpdated"));
        setIsEditing(false);
      } else {
        toast.error(result.error || t("game.scoreboard.scoreUpdateError"));
      }
    });
  };

  // Helper to get participant display name
  const getParticipantName = (
    participant: (typeof participants)[0],
  ): string => {
    if (participant.__typename === "TeamInstance") {
      return participant.name;
    }
    return `${participant.player.firstName} ${participant.player.lastName}`;
  };

  if (participants.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("game.scoreboard.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("game.scoreboard.noParticipants")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const nameA = getParticipantName(participantA);
  const nameB = getParticipantName(participantB);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("game.scoreboard.title")}</CardTitle>
        {canEdit && !isEditing && (
          <Button variant="ghost" size="sm" onClick={handleStartEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {game.sportType === "BASKETBALL" || game.sportType === "FOOTBALL" ? (
          isEditing ? (
            <SimpleScoreEditor
              nameA={nameA}
              nameB={nameB}
              scoreA={scoreA}
              scoreB={scoreB}
              onScoreAChange={setScoreA}
              onScoreBChange={setScoreB}
              onSave={handleSave}
              onCancel={handleCancel}
              isPending={isPending}
            />
          ) : (
            <SimpleScoreDisplay
              nameA={nameA}
              nameB={nameB}
              metadataA={participantA.metadata}
              metadataB={participantB.metadata}
            />
          )
        ) : game.sportType === "TENNIS" ? (
          isEditing ? (
            <TennisScoreEditor
              nameA={nameA}
              nameB={nameB}
              sets={sets}
              onSetsChange={setSets}
              onSave={handleSave}
              onCancel={handleCancel}
              isPending={isPending}
            />
          ) : (
            <TennisScoreDisplay
              nameA={nameA}
              nameB={nameB}
              metadataA={participantA.metadata}
              metadataB={participantB.metadata}
            />
          )
        ) : null}
      </CardContent>
    </Card>
  );
}

// Simple Score Display (Basketball/Football)
function SimpleScoreDisplay({
  nameA,
  nameB,
  metadataA,
  metadataB,
}: {
  nameA: string;
  nameB: string;
  metadataA:
    | BasketballParticipantMetadata
    | FootballParticipantMetadata
    | TennisParticipantMetadata
    | null;
  metadataB:
    | BasketballParticipantMetadata
    | FootballParticipantMetadata
    | TennisParticipantMetadata
    | null;
}) {
  const t = useTranslations();

  const scoreA =
    metadataA?.__typename === "BasketballParticipantMetadata" ||
    metadataA?.__typename === "FootballParticipantMetadata"
      ? metadataA.score
      : null;
  const scoreB =
    metadataB?.__typename === "BasketballParticipantMetadata" ||
    metadataB?.__typename === "FootballParticipantMetadata"
      ? metadataB.score
      : null;

  if (scoreA === null && scoreB === null) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        {t("game.scoreboard.noScores")}
      </p>
    );
  }

  return (
    <div className="flex items-center justify-around py-4">
      <div className="text-center">
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          {nameA}
        </p>
        <p className="text-5xl font-bold">{scoreA ?? "-"}</p>
      </div>
      <div className="text-3xl font-bold text-muted-foreground">-</div>
      <div className="text-center">
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          {nameB}
        </p>
        <p className="text-5xl font-bold">{scoreB ?? "-"}</p>
      </div>
    </div>
  );
}

// Simple Score Editor (Basketball/Football)
function SimpleScoreEditor({
  nameA,
  nameB,
  scoreA,
  scoreB,
  onScoreAChange,
  onScoreBChange,
  onSave,
  onCancel,
  isPending,
}: {
  nameA: string;
  nameB: string;
  scoreA: number;
  scoreB: number;
  onScoreAChange: (score: number) => void;
  onScoreBChange: (score: number) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const t = useTranslations();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium">{nameA}</label>
          <Input
            type="number"
            min={0}
            value={scoreA}
            onChange={(e) => onScoreAChange(Number(e.target.value))}
            disabled={isPending}
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium">{nameB}</label>
          <Input
            type="number"
            min={0}
            value={scoreB}
            onChange={(e) => onScoreBChange(Number(e.target.value))}
            disabled={isPending}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          {t("game.scoreboard.cancel")}
        </Button>
        <Button onClick={onSave} disabled={isPending}>
          {isPending ? t("game.scoreboard.saving") : t("game.scoreboard.save")}
        </Button>
      </div>
    </div>
  );
}

// Tennis Score Display
function TennisScoreDisplay({
  nameA,
  nameB,
  metadataA,
  metadataB,
}: {
  nameA: string;
  nameB: string;
  metadataA:
    | BasketballParticipantMetadata
    | FootballParticipantMetadata
    | TennisParticipantMetadata
    | null;
  metadataB:
    | BasketballParticipantMetadata
    | FootballParticipantMetadata
    | TennisParticipantMetadata
    | null;
}) {
  const t = useTranslations();

  if (
    metadataA?.__typename !== "TennisParticipantMetadata" ||
    metadataB?.__typename !== "TennisParticipantMetadata"
  ) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        {t("game.scoreboard.noScores")}
      </p>
    );
  }

  const maxSets = Math.max(metadataA.sets.length, metadataB.sets.length);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Player</TableHead>
            <TableHead className="text-center">
              {t("game.scoreboard.setsWon")}
            </TableHead>
            {Array.from({ length: maxSets }, (_, i) => (
              <TableHead key={i} className="text-center">
                {t("game.scoreboard.set")} {i + 1}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">{nameA}</TableCell>
            <TableCell className="text-center">{metadataA.setsWon}</TableCell>
            {metadataA.sets.map((set, i) => (
              <TableCell key={i} className="text-center">
                {formatSetScore(set, metadataB.sets[i])}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">{nameB}</TableCell>
            <TableCell className="text-center">{metadataB.setsWon}</TableCell>
            {metadataB.sets.map((set, i) => (
              <TableCell key={i} className="text-center">
                {formatSetScore(set, metadataA.sets[i])}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

// Format a tennis set score
function formatSetScore(
  playerSet: { gamesWon: number; tiebreakPoints: number | null },
  opponentSet?: { gamesWon: number; tiebreakPoints: number | null },
): string {
  const playerGames = playerSet.gamesWon;
  const opponentGames = opponentSet?.gamesWon ?? 0;

  // Show tiebreak points if this player won a tiebreak (7-6 scenario)
  if (
    playerGames === 7 &&
    opponentGames === 6 &&
    opponentSet?.tiebreakPoints !== null &&
    opponentSet?.tiebreakPoints !== undefined
  ) {
    return `${playerGames}`;
  }
  if (
    opponentGames === 7 &&
    playerGames === 6 &&
    playerSet.tiebreakPoints !== null &&
    playerSet.tiebreakPoints !== undefined
  ) {
    return `${playerGames}(${playerSet.tiebreakPoints})`;
  }

  return String(playerGames);
}

// Tennis Score Editor
function TennisScoreEditor({
  nameA,
  nameB,
  sets,
  onSetsChange,
  onSave,
  onCancel,
  isPending,
}: {
  nameA: string;
  nameB: string;
  sets: { playerA: TennisSetScoreInput; playerB: TennisSetScoreInput }[];
  onSetsChange: (
    sets: { playerA: TennisSetScoreInput; playerB: TennisSetScoreInput }[],
  ) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const t = useTranslations();

  const handleAddSet = () => {
    onSetsChange([
      ...sets,
      {
        playerA: { gamesWon: 0, tiebreakPoints: null },
        playerB: { gamesWon: 0, tiebreakPoints: null },
      },
    ]);
  };

  const handleRemoveSet = (index: number) => {
    onSetsChange(sets.filter((_, i) => i !== index));
  };

  const handleSetChange = (
    setIndex: number,
    player: "playerA" | "playerB",
    field: "gamesWon" | "tiebreakPoints",
    value: number | null,
  ) => {
    const updated = [...sets];
    updated[setIndex][player][field] = value as never;
    onSetsChange(updated);
  };

  return (
    <div className="space-y-4">
      {sets.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          {t("game.scoreboard.noScores")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Player</TableHead>
                {sets.map((_, i) => (
                  <TableHead key={i} className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {t("game.scoreboard.set")} {i + 1}
                      <Button
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
                {sets.map((set, i) => (
                  <TableCell key={i}>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        className="w-16"
                        value={set.playerA.gamesWon}
                        onChange={(e) =>
                          handleSetChange(
                            i,
                            "playerA",
                            "gamesWon",
                            Number(e.target.value),
                          )
                        }
                        disabled={isPending}
                      />
                      <Input
                        type="number"
                        min={0}
                        className="w-16"
                        placeholder={t("game.scoreboard.tiebreakPoints")}
                        value={set.playerA.tiebreakPoints ?? ""}
                        onChange={(e) =>
                          handleSetChange(
                            i,
                            "playerA",
                            "tiebreakPoints",
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
                        disabled={isPending}
                      />
                    </div>
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">{nameB}</TableCell>
                {sets.map((set, i) => (
                  <TableCell key={i}>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        className="w-16"
                        value={set.playerB.gamesWon}
                        onChange={(e) =>
                          handleSetChange(
                            i,
                            "playerB",
                            "gamesWon",
                            Number(e.target.value),
                          )
                        }
                        disabled={isPending}
                      />
                      <Input
                        type="number"
                        min={0}
                        className="w-16"
                        placeholder={t("game.scoreboard.tiebreakPoints")}
                        value={set.playerB.tiebreakPoints ?? ""}
                        onChange={(e) =>
                          handleSetChange(
                            i,
                            "playerB",
                            "tiebreakPoints",
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
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
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleAddSet} disabled={isPending}>
          {t("game.scoreboard.addSet")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            {t("game.scoreboard.cancel")}
          </Button>
          <Button onClick={onSave} disabled={isPending}>
            {isPending
              ? t("game.scoreboard.saving")
              : t("game.scoreboard.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
