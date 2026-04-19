"use client";

import {
  addIndividualParticipant,
  removeIndividualParticipant,
} from "@/app/[locale]/game/participant-actions";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { TypographySmall } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import { GameInvitationStatus, GameRole, GameVisibility } from "@/lib/constants";
import type {
  GameParticipantDetail,
  IndividualParticipantNode,
  UserRef,
} from "@/lib/types/game";
import type { ViewerGameInvitation } from "@/lib/types/game-invitation";
import { cn } from "@/lib/utils";
import { UserPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

interface IndividualParticipantListProps {
  participants: GameParticipantDetail[];
  gameId: number;
  currentUserId: number;
  atParticipantLimit: boolean;
  viewerGameRole: GameRole | null;
  visibility: GameVisibility;
  viewerInvitation: ViewerGameInvitation | null;
}

export function IndividualParticipantList({
  participants,
  gameId,
  currentUserId,
  atParticipantLimit,
  viewerGameRole,
  visibility,
  viewerInvitation,
}: IndividualParticipantListProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  // v1 scope: only render individual participants backed by a registered
  // User. Guests have no username to link to and no user profile to deep-link
  // into — the leagues feature will add a richer guest-display pass later.
  const userParticipants = participants.filter(
    (p): p is IndividualParticipantNode & { participant: UserRef } =>
      p.__typename === "IndividualParticipant" &&
      p.participant.__typename === "User",
  );

  const currentUserParticipant = userParticipants.find(
    (p) => p.participant.id === currentUserId,
  );

  const canJoin =
    !atParticipantLimit &&
    !currentUserParticipant &&
    (viewerGameRole != null ||
      visibility === GameVisibility.PUBLIC ||
      viewerInvitation?.status === GameInvitationStatus.ACCEPTED);

  function handleJoinGame(): void {
    startTransition(async () => {
      const result = await addIndividualParticipant({
        gameId,
        userId: currentUserId,
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
        {currentUserParticipant ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRemoveParticipant(currentUserParticipant.id)}
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
      {userParticipants.length === 0 ? (
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
            userParticipants.length === 2
              ? "grid md:grid-cols-2 gap-4"
              : "flex flex-col gap-4",
          )}
        >
          {userParticipants.map((participant) => {
            const user = participant.participant;

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
                <UserAvatar user={user} size="lg" loading="lazy" />

                <TypographySmall className="font-semibold truncate min-w-0 flex-1">
                  <Link
                    href={`/user/${user.username}`}
                    className="after:absolute after:inset-0 after:z-[1] text-foreground hover:text-primary transition-colors focus-visible:outline-none"
                  >
                    {user.displayName}
                  </Link>
                </TypographySmall>

                {viewerGameRole != null && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveParticipant(participant.id)}
                    disabled={isPending}
                    aria-label={`${t("game.participants.removeMember")} ${user.displayName}`}
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
