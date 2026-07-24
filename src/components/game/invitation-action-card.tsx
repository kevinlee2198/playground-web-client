"use client";

import {
  acceptGameInvitation,
  declineGameInvitation,
} from "@/app/[locale]/game/invitation-actions";
import { Button } from "@/components/ui/button";
import { TypographyMuted, TypographySmall } from "@/components/ui/typography";
import { GameInvitationStatus } from "@/lib/constants";
import type { ViewerGameInvitation } from "@/lib/types/game-invitation";
import { CheckCircle, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "@/components/ui/toast";

interface InvitationActionCardProps {
  invitation: ViewerGameInvitation;
  isParticipant: boolean;
  isTeamBased: boolean;
}

export function InvitationActionCard({
  invitation,
  isParticipant,
  isTeamBased,
}: InvitationActionCardProps) {
  const t = useTranslations("game.invitations");
  const [isPending, startTransition] = useTransition();

  if (isParticipant) return null;

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptGameInvitation(invitation.id);
      if (result.success) {
        toast.add({ title: t("success.accepted"), type: "success" });
      } else {
        toast.add({ title: result.message ?? t("errors.acceptFailed"), type: "error" });
      }
    });
  }

  function handleDecline() {
    startTransition(async () => {
      const result = await declineGameInvitation(invitation.id);
      if (result.success) {
        toast.add({ title: t("success.declined"), type: "success" });
      } else {
        toast.add({ title: result.message ?? t("errors.declineFailed"), type: "error" });
      }
    });
  }

  if (invitation.status === GameInvitationStatus.PENDING) {
    return (
      <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1 min-w-0">
            <TypographySmall className="font-semibold">
              {t("pendingTitle")}
            </TypographySmall>
            <TypographyMuted className="text-sm">
              {t("invitedBy", { name: invitation.inviter.displayName })}
            </TypographyMuted>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={isPending}
            className="min-h-11 flex-1 sm:flex-none"
          >
            {isPending ? t("accepting") : t("accept")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDecline}
            disabled={isPending}
            className="min-h-11 flex-1 sm:flex-none"
          >
            {isPending ? t("declining") : t("decline")}
          </Button>
        </div>
      </div>
    );
  }

  if (invitation.status === GameInvitationStatus.ACCEPTED) {
    return (
      <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <CheckCircle className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <TypographySmall>
            {isTeamBased
              ? t("acceptedGuidanceTeam")
              : t("acceptedGuidanceIndividual")}
          </TypographySmall>
        </div>
      </div>
    );
  }

  return null;
}
