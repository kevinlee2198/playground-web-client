"use client";

import {
  addIndividualParticipant,
  removeIndividualParticipant,
} from "@/app/[locale]/game/participant-actions";
import { PlayerAvatar } from "@/components/game/player-avatar";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { TypographySmall } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import { GameRole, GameVisibility } from "@/lib/constants";
import type {
  GameParticipantDetail,
  IndividualParticipantNode,
} from "@/lib/types/game";
import { cn } from "@/lib/utils";
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

  const individualParticipants = participants.filter(
    (p): p is IndividualParticipantNode =>
      p.__typename === "IndividualParticipant",
  );

  const currentPlayerParticipant =
    individualParticipants.find((p) => p.player.id === currentPlayerId);

  const canJoin =
    !atParticipantLimit &&
    !currentPlayerParticipant &&
    (viewerGameRole != null || visibility === GameVisibility.PUBLIC);

  function handleJoinGame(): void {
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
  }

  function handleRemoveParticipant(participantId: number): void {
    startTransition(async () => {
      const result = await removeIndividualParticipant({
        id: participantId,
      });

      if (result.success) {
        toast.success(t("game.success.participantRemoved"));
      } else {
        toast.error(result.message || t("game.errors.participantError"));
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Join/Leave Game Button */}
      <div className="flex justify-end">
        {currentPlayerParticipant ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRemoveParticipant(currentPlayerParticipant.id)}
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
        <div
          className={cn(
            individualParticipants.length === 2
              ? "grid md:grid-cols-2 gap-4"
              : "flex flex-col gap-4",
          )}
        >
          {individualParticipants.map((participant) => {
            const player = participant.player;

            return (
              <div
                key={participant.id}
                className={cn(
                  "relative bg-card rounded-xl shadow-card p-4",
                  "flex items-center gap-3",
                  "focus-within:ring-2 focus-within:ring-ring",
                  "motion-safe:hover:shadow-card-hover motion-safe:hover:-translate-y-0.5 transition-[transform,box-shadow]",
                )}
              >
                <PlayerAvatar player={player} size="lg" loading="lazy" />

                <TypographySmall className="font-semibold truncate min-w-0 flex-1">
                  <Link
                    href={`/user/${player.user.username}`}
                    className="after:absolute after:inset-0 after:z-[1] text-foreground hover:text-primary transition-colors focus-visible:outline-none"
                  >
                    {player.user.displayName}
                  </Link>
                </TypographySmall>

                {viewerGameRole != null && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveParticipant(participant.id)}
                    disabled={isPending}
                    aria-label={`${t("game.participants.removePlayer")} ${player.user.displayName}`}
                    className="relative z-10 min-h-11 min-w-11 shrink-0"
                  >
                    <X className="h-4 w-4" />
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
