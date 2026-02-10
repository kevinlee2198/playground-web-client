"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GameStatus, SportType } from "@/lib/constants";
import type { GameDetail } from "@/lib/types/game";
import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { BasketballScoreDisplay } from "./scoreboard/basketball-score-display";
import { BasketballScoreForm } from "./scoreboard/basketball-score-form";
import { FootballScoreDisplay } from "./scoreboard/football-score-display";
import { FootballScoreForm } from "./scoreboard/football-score-form";
import { TennisScoreDisplay } from "./scoreboard/tennis-score-display";
import { TennisScoreForm } from "./scoreboard/tennis-score-form";

interface GameScoreboardProps {
  game: GameDetail;
}

export function GameScoreboard({ game }: GameScoreboardProps) {
  const t = useTranslations();
  const [isEditing, setIsEditing] = useState(false);

  const participants = game.participants.edges.map((e) => e.node);
  const canEdit =
    game.gameStatus === GameStatus.IN_PROGRESS ||
    game.gameStatus === GameStatus.COMPLETE;

  if (game.gameStatus === GameStatus.SCHEDULED) {
    return null;
  }

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

  const [participantA, participantB] = participants;

  const getParticipantName = (
    participant: (typeof participants)[0],
  ): string => {
    if (participant.__typename === "TeamInstance") {
      return participant.name;
    }
    return `${participant.player.firstName} ${participant.player.lastName}`;
  };

  const nameA = getParticipantName(participantA);
  const nameB = getParticipantName(participantB);

  const handleSuccess = () => setIsEditing(false);
  const handleCancel = () => setIsEditing(false);

  const renderContent = () => {
    switch (game.sportType) {
      case SportType.BASKETBALL:
        return isEditing ? (
          <BasketballScoreForm
            sportType={SportType.BASKETBALL}
            participantA={participantA}
            participantB={participantB}
            nameA={nameA}
            nameB={nameB}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        ) : (
          <BasketballScoreDisplay
            nameA={nameA}
            nameB={nameB}
            metadataA={participantA.metadata}
            metadataB={participantB.metadata}
          />
        );
      case SportType.FOOTBALL:
        return isEditing ? (
          <FootballScoreForm
            sportType={SportType.FOOTBALL}
            participantA={participantA}
            participantB={participantB}
            nameA={nameA}
            nameB={nameB}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        ) : (
          <FootballScoreDisplay
            nameA={nameA}
            nameB={nameB}
            metadataA={participantA.metadata}
            metadataB={participantB.metadata}
          />
        );
      case SportType.TENNIS:
        return isEditing ? (
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
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        ) : (
          <TennisScoreDisplay
            nameA={nameA}
            nameB={nameB}
            metadataA={participantA.metadata}
            metadataB={participantB.metadata}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("game.scoreboard.title")}</CardTitle>
        {canEdit && !isEditing && (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
