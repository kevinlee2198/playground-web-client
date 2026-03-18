"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { TypographyH4 } from "@/components/ui/typography";
import {
  GameVisibility,
  getSportMaxParticipants,
  getSportParticipationType,
  getSubtypeFromMetadata,
  ParticipationType,
} from "@/lib/constants";
import type { GameDetail } from "@/lib/types/game";
import { cn } from "@/lib/utils";
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
  const participationType = getSportParticipationType(game.sportType, subtype);
  const isTeamBased = participationType === ParticipationType.TEAM;
  const hasParticipants = game.participants.edges.length > 0;
  const maxParticipants = getSportMaxParticipants(game.sportType, subtype);
  const atParticipantLimit = game.participants.edges.length >= maxParticipants;

  const isPlayerOnAnyTeam =
    isTeamBased &&
    game.participants.edges.some(
      (edge) =>
        edge.node.__typename === "TeamInstance" &&
        edge.node.players.some((p) => p.id === currentPlayerId),
    );

  const teamCount = isTeamBased ? game.participants.edges.length : 0;

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <TypographyH4>{t("game.participants.title")}</TypographyH4>
        {isTeamBased &&
          !atParticipantLimit &&
          (game.viewerGameRole != null ||
            game.visibility === GameVisibility.PUBLIC) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddTeamDialog(true)}
            >
              {t("game.participants.addTeam")}
            </Button>
          )}
      </div>

      {/* Content */}
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
        <div
          className={cn(
            "grid gap-4",
            teamCount >= 2 && "md:grid-cols-2",
          )}
        >
          {game.participants.edges.map((edge, index) => {
            const participant = edge.node;
            if (participant.__typename === "TeamInstance") {
              return (
                <TeamCard
                  key={participant.id}
                  team={participant}
                  gameStatus={game.gameStatus}
                  currentPlayerId={currentPlayerId}
                  isPlayerOnAnyTeam={isPlayerOnAnyTeam}
                  viewerGameRole={game.viewerGameRole}
                  visibility={game.visibility}
                  participantIndex={index}
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
    </div>
  );
}
