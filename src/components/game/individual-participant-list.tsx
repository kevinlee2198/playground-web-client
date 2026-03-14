"use client";

import {
  addIndividualParticipant,
  removeIndividualParticipant,
} from "@/app/[locale]/game/participant-actions";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { GameRole, GameVisibility } from "@/lib/constants";
import type { GameParticipantDetail } from "@/lib/types/game";
import { UserPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

interface IndividualParticipantListProps {
  participants: GameParticipantDetail[];
  gameId: number;
  currentPlayerId: number;
  atParticipantLimit: boolean;
  viewerGameRole: GameRole | null;
  visibility: GameVisibility;
}

export function IndividualParticipantList({
  participants,
  gameId,
  currentPlayerId,
  atParticipantLimit,
  viewerGameRole,
  visibility,
}: IndividualParticipantListProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  // Extract individual participants
  const individualParticipants = participants.filter(
    (p) => p.__typename === "IndividualParticipant",
  );

  const isCurrentPlayerParticipant = individualParticipants.some(
    (p) =>
      p.__typename === "IndividualParticipant" &&
      p.player.id === currentPlayerId,
  );

  const canJoin =
    !atParticipantLimit &&
    !isCurrentPlayerParticipant &&
    (viewerGameRole != null || visibility === GameVisibility.PUBLIC);

  const handleJoinGame = () => {
    startTransition(async () => {
      const result = await addIndividualParticipant({
        gameId,
        playerId: currentPlayerId,
      });

      if (result.success) {
        toast.success(t("game.success.participantAdded"));
      } else {
        toast.error(result.message || t("game.errors.participantError"));
      }
    });
  };

  const handleLeaveGame = () => {
    startTransition(async () => {
      const result = await removeIndividualParticipant({
        gameId,
        playerId: currentPlayerId,
      });

      if (result.success) {
        toast.success(t("game.success.participantRemoved"));
      } else {
        toast.error(result.message || t("game.errors.participantError"));
      }
    });
  };

  const handleRemoveParticipant = (playerId: number) => {
    startTransition(async () => {
      const result = await removeIndividualParticipant({
        gameId,
        playerId,
      });

      if (result.success) {
        toast.success(t("game.success.participantRemoved"));
      } else {
        toast.error(result.message || t("game.errors.participantError"));
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Join/Leave Game Button */}
      <div className="flex justify-end">
        {isCurrentPlayerParticipant ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleLeaveGame}
            disabled={isPending}
          >
            {t("game.participants.leaveGame")}
          </Button>
        ) : (
          canJoin && (
            <Button
              variant="default"
              size="sm"
              onClick={handleJoinGame}
              disabled={isPending}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {t("game.participants.joinGame")}
            </Button>
          )
        )}
      </div>

      {/* Participant List */}
      {individualParticipants.length === 0 ? (
        <Empty className="border-none">
          <EmptyHeader>
            <EmptyDescription>
              {t("game.participants.noParticipants")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {individualParticipants.map((participant) => {
            if (participant.__typename !== "IndividualParticipant") return null;

            const player = participant.player;
            const playerName = player.user.displayName;

            return (
              <div
                key={participant.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <p className="font-medium">{playerName}</p>
                {viewerGameRole != null && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveParticipant(player.id)}
                    disabled={isPending}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">
                      {t("game.participants.removeParticipant")}
                    </span>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
