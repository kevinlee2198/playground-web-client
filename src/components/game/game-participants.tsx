"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import {
  GameVisibility,
  getMaxParticipants,
  getParticipationType,
  getSubtypeFromMetadata,
  ParticipationType,
} from "@/lib/constants";
import type { GameDetail, TeamInstanceDetail } from "@/lib/types/game";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AddTeamForm } from "./add-team-form";
import { IndividualParticipantList } from "./individual-participant-list";
import { TeamCard } from "./team-card";

interface GameParticipantsProps {
  game: GameDetail;
  currentPlayerId: number;
}

export function GameParticipants({
  game,
  currentPlayerId,
}: GameParticipantsProps) {
  const t = useTranslations();
  const [showAddTeamDialog, setShowAddTeamDialog] = useState(false);

  const subtype = getSubtypeFromMetadata(game.metadata);
  const participationType = getParticipationType(subtype);
  const isTeamBased = participationType === ParticipationType.TEAM;
  const hasParticipants = game.participants.edges.length > 0;
  const maxParticipants = getMaxParticipants(subtype);
  const atParticipantLimit = game.participants.edges.length >= maxParticipants;

  const isPlayerOnAnyTeam =
    isTeamBased &&
    game.participants.edges.some((edge) => {
      const node = edge.node;
      return (
        node.__typename === "TeamInstance" &&
        (node as TeamInstanceDetail).players.some(
          (p) => p.id === currentPlayerId,
        )
      );
    });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("game.participants.title")}</CardTitle>
          {isTeamBased && !atParticipantLimit && (game.viewerGameRole != null || game.visibility === GameVisibility.PUBLIC) && (
            <Button onClick={() => setShowAddTeamDialog(true)} size="sm">
              {t("game.participants.addTeam")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasParticipants && (
          <Empty className="border-none">
            <EmptyHeader>
              <EmptyDescription>
                {t("game.participants.noParticipants")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
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
                    viewerGameRole={game.viewerGameRole}
                    visibility={game.visibility}
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
            viewerGameRole={game.viewerGameRole}
            visibility={game.visibility}
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
