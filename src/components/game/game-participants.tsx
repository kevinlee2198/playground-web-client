"use client";

import { getMaxParticipants, getParticipationType, ParticipationType } from "@/lib/constants";
import type { GameDetail, TeamInstanceDetail } from "@/lib/types/game";
import { TeamCard } from "./team-card";
import { IndividualParticipantList } from "./individual-participant-list";
import { AddTeamForm } from "./add-team-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface GameParticipantsProps {
  game: GameDetail;
  currentPlayerId: number;
}

export function GameParticipants({ game, currentPlayerId }: GameParticipantsProps) {
  const t = useTranslations();
  const [showAddTeamDialog, setShowAddTeamDialog] = useState(false);

  const participationType = getParticipationType(game.sportSubtype);
  const isTeamBased = participationType === ParticipationType.TEAM;
  const hasParticipants = game.participants.edges.length > 0;
  const maxParticipants = getMaxParticipants(game.sportSubtype);
  const atParticipantLimit = game.participants.edges.length >= maxParticipants;

  const isPlayerOnAnyTeam = isTeamBased && game.participants.edges.some((edge) => {
    const node = edge.node;
    return node.__typename === "TeamInstance" &&
      (node as TeamInstanceDetail).players.some((p) => p.id === currentPlayerId);
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("game.participants.title")}</CardTitle>
          {isTeamBased && !atParticipantLimit && (
            <Button onClick={() => setShowAddTeamDialog(true)} size="sm">
              {t("game.participants.addTeam")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasParticipants && (
          <p className="text-muted-foreground">
            {t("game.participants.noParticipants")}
          </p>
        )}

        {isTeamBased && hasParticipants && (
          <div className="space-y-4">
            {game.participants.edges.map((edge) => {
              const participant = edge.node;
              if (participant.__typename === "TeamInstance") {
                return (
                  <TeamCard
                    key={participant.id}
                    team={participant}
                    gameId={game.id}
                    gameStatus={game.gameStatus}
                    currentPlayerId={currentPlayerId}
                    isPlayerOnAnyTeam={isPlayerOnAnyTeam}
                  />
                );
              }
              return null;
            })}
          </div>
        )}

        {!isTeamBased && (
          <IndividualParticipantList
            participants={game.participants.edges.map((edge) => edge.node)}
            gameId={game.id}
            currentPlayerId={currentPlayerId}
            atParticipantLimit={atParticipantLimit}
          />
        )}
      </CardContent>

      {/* Add Team Dialog */}
      <Dialog open={showAddTeamDialog} onOpenChange={setShowAddTeamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("game.participants.addTeam")}</DialogTitle>
          </DialogHeader>
          <AddTeamForm
            gameId={game.id}
            onSuccess={() => setShowAddTeamDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
