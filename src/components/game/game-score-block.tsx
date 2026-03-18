"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameScore } from "@/components/game/score/game-score";
import { getParticipantName } from "@/components/game/score/participant-utils";
import { BaseballScoreForm } from "@/components/game/scoreboard/baseball-score-form";
import { BasketballScoreForm } from "@/components/game/scoreboard/basketball-score-form";
import { FootballScoreForm } from "@/components/game/scoreboard/football-score-form";
import { PickleballScoreForm } from "@/components/game/scoreboard/pickleball-score-form";
import { TennisScoreForm } from "@/components/game/scoreboard/tennis-score-form";
import { Button } from "@/components/ui/button";
import { GameStatus, SportType } from "@/lib/constants";
import type { GameDetail } from "@/lib/types/game";

interface GameScoreBlockProps {
  game: GameDetail;
  statusPill: ReactNode;
}

export function GameScoreBlock({ game, statusPill }: GameScoreBlockProps) {
  const t = useTranslations();
  const [isEditing, setIsEditing] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);

  const participants = game.participants.edges.map((e) => e.node);
  const isLive = game.gameStatus === GameStatus.IN_PROGRESS;
  const canEdit =
    game.viewerGameRole != null &&
    !game.resultsFinalized &&
    (game.gameStatus === GameStatus.IN_PROGRESS ||
      game.gameStatus === GameStatus.COMPLETE);

  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => {
        formContainerRef.current?.querySelector<HTMLElement>("input")?.focus();
      });
    }
  }, [isEditing]);

  // Force-close score form if results are finalized by another user while editing
  const resultsFinalizedRef = useRef(game.resultsFinalized);
  useEffect(() => {
    const wasFinalizedBefore = resultsFinalizedRef.current;
    resultsFinalizedRef.current = game.resultsFinalized;
    if (!wasFinalizedBefore && game.resultsFinalized && isEditing) {
      requestAnimationFrame(() => {
        setIsEditing(false);
        toast.error(t("game.live.resultsFinalizedWhileEditing"));
        editButtonRef.current?.focus();
      });
    }
  });

  function handleClose() {
    setIsEditing(false);
    requestAnimationFrame(() => editButtonRef.current?.focus());
  }

  if (participants.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("game.scoreboard.noParticipants")}
      </p>
    );
  }

  const [participantA, participantB] = participants;
  const nameA = getParticipantName(participantA);
  const nameB = getParticipantName(participantB);

  function renderScoreForm(): ReactNode {
    switch (game.sportType) {
      case SportType.BASEBALL:
        return (
          <BaseballScoreForm
            sportType={SportType.BASEBALL}
            participantA={participantA}
            participantB={participantB}
            nameA={nameA}
            nameB={nameB}
            onSuccess={handleClose}
            onCancel={handleClose}
          />
        );
      case SportType.BASKETBALL:
        return (
          <BasketballScoreForm
            sportType={SportType.BASKETBALL}
            participantA={participantA}
            participantB={participantB}
            nameA={nameA}
            nameB={nameB}
            onSuccess={handleClose}
            onCancel={handleClose}
          />
        );
      case SportType.FOOTBALL:
        return (
          <FootballScoreForm
            sportType={SportType.FOOTBALL}
            participantA={participantA}
            participantB={participantB}
            nameA={nameA}
            nameB={nameB}
            onSuccess={handleClose}
            onCancel={handleClose}
          />
        );
      case SportType.TENNIS:
        return (
          <TennisScoreForm
            participantA={participantA}
            participantB={participantB}
            nameA={nameA}
            nameB={nameB}
            bestOf={
              game.metadata.__typename === "TennisGameMetadata"
                ? game.metadata.bestOf
                : 3
            }
            onSuccess={handleClose}
            onCancel={handleClose}
          />
        );
      case SportType.PICKLEBALL:
        return (
          <PickleballScoreForm
            participantA={participantA}
            participantB={participantB}
            nameA={nameA}
            nameB={nameB}
            bestOf={
              game.metadata.__typename === "PickleballGameMetadata" &&
              game.metadata.bestOf != null
                ? game.metadata.bestOf
                : 3
            }
            onSuccess={handleClose}
            onCancel={handleClose}
          />
        );
      default:
        return null;
    }
  }

  const scoreArea = isEditing ? (
    <div ref={formContainerRef}>{renderScoreForm()}</div>
  ) : (
    <>
      <GameScore
        sportType={game.sportType}
        participants={participants}
        statusPill={statusPill}
        size="lg"
      />
      {canEdit && (
        <Button
          ref={editButtonRef}
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label={t("game.scoreboard.edit")}
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
    </>
  );

  if (isLive) {
    return (
      <div aria-live="polite" aria-atomic={true}>
        {scoreArea}
      </div>
    );
  }

  return scoreArea;
}
