"use client";

import {
  joinTeam,
  leaveTeam,
  removeTeamParticipant,
} from "@/app/[locale]/game/participant-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TypographyMuted, TypographySmall } from "@/components/ui/typography";
import { deriveTeamName } from "@/components/game/score/participant-utils";
import { Link } from "@/i18n/navigation";
import { GameInvitationStatus, GameRole, GameStatus, GameVisibility } from "@/lib/constants";
import type { TeamInstanceDetail, UserRef } from "@/lib/types/game";
import type { ViewerGameInvitation } from "@/lib/types/game-invitation";
import { cn } from "@/lib/utils";
import { ChevronRight, MoreHorizontal, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";
import { UserAvatar } from "@/components/ui/user-avatar";

const BORDER_COLORS = [
  "border-l-primary",
  "border-l-accent",
  "border-l-[oklch(0.60_0.12_230)]",
  "border-l-[oklch(0.65_0.12_85)]",
] as const;

interface TeamCardProps {
  team: TeamInstanceDetail;
  gameStatus: GameStatus;
  currentUserId: number;
  isUserOnAnyTeam: boolean;
  viewerGameRole: GameRole | null;
  visibility: GameVisibility;
  participantIndex: number;
  viewerInvitation: ViewerGameInvitation | null;
}

export function TeamCard({
  team,
  gameStatus,
  currentUserId,
  isUserOnAnyTeam,
  viewerGameRole,
  visibility,
  participantIndex,
  viewerInvitation,
}: TeamCardProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [showRemoveTeamDialog, setShowRemoveTeamDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [userToRemove, setUserToRemove] = useState<UserRef | null>(null);

  const isUserOnTeam =
    team.roster.some((u) => u.id === currentUserId);
  const gameHasStarted =
    gameStatus === GameStatus.IN_PROGRESS || gameStatus === GameStatus.COMPLETE;

  const canJoinOrLeave =
    viewerGameRole != null ||
    visibility === GameVisibility.PUBLIC ||
    viewerInvitation?.status === GameInvitationStatus.ACCEPTED;
  const showJoinButton =
    !isUserOnTeam && !isUserOnAnyTeam && canJoinOrLeave;
  const showLeaveButton = isUserOnTeam;
  const isEditor = viewerGameRole != null;

  const borderColor = BORDER_COLORS[participantIndex % BORDER_COLORS.length];
  const teamName = deriveTeamName(team, t("leagues.team.unnamed"));

  function handleJoinTeam(): void {
    startTransition(async () => {
      const result = await joinTeam({
        teamInstanceId: team.id,
        userId: currentUserId,
      });

      if (result.success) {
        toast.add({ title: t("game.success.participantAdded"), type: "success" });
      } else {
        toast.add({ title: result.message || t("game.errors.participantError"), type: "error" });
      }
    });
  }

  function handleRemoveUserFromTeam(userId: number): void {
    startTransition(async () => {
      const result = await leaveTeam({
        teamInstanceId: team.id,
        userId,
      });

      if (result.success) {
        toast.add({ title: t("game.success.participantRemoved"), type: "success" });
        setUserToRemove(null);
      } else {
        toast.add({ title: result.message || t("game.errors.participantError"), type: "error" });
      }
    });
  }

  function handleRemoveTeam(): void {
    startTransition(async () => {
      const result = await removeTeamParticipant({
        teamInstanceId: team.id,
      });

      if (result.success) {
        toast.add({ title: t("game.success.participantRemoved"), type: "success" });
        setShowRemoveTeamDialog(false);
      } else {
        toast.add({ title: result.message || t("game.errors.participantError"), type: "error" });
      }
    });
  }

  return (
    <>
      <div
        className={cn(
          "bg-card rounded-2xl shadow-card border-l-[3px]",
          "motion-safe:hover:shadow-card-hover motion-safe:hover:-translate-y-0.5 transition-[transform,box-shadow]",
          borderColor,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <TypographySmall className="font-bold truncate">{teamName}</TypographySmall>
            <Badge variant="secondary" className="shrink-0">
              {t("game.participants.memberCount", {
                count: team.roster.length,
              })}
            </Badge>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {showLeaveButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={
                  gameHasStarted
                    ? () => setShowLeaveDialog(true)
                    : () => handleRemoveUserFromTeam(currentUserId)
                }
                disabled={isPending}
              >
                {t("game.participants.leaveTeam")}
              </Button>
            )}
            {showJoinButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleJoinTeam}
                disabled={isPending}
              >
                {t("game.participants.joinTeam")}
              </Button>
            )}
            {isEditor && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isPending}
                      aria-label={t("game.participants.teamOptions")}
                      className="min-h-11 min-w-11"
                    />
                  }
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setShowRemoveTeamDialog(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("game.participants.removeTeam")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Roster rows */}
        <div className="px-4 pb-4">
          {team.roster.length > 0 ? (
            <div className="divide-y divide-border">
              {team.roster.map((user) => (
                <RosterRow
                  key={user.id}
                  user={user}
                  isCurrentUser={user.id === currentUserId}
                  isEditor={isEditor}
                  isPending={isPending}
                  onRemove={() => setUserToRemove(user)}
                />
              ))}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center gap-3">
              <TypographyMuted className="text-center">
                {t("game.participants.noMembersYet")}
              </TypographyMuted>
              {showJoinButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleJoinTeam}
                  disabled={isPending}
                >
                  {t("game.participants.joinTeam")}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Leave Team Confirmation Dialog (shown when game has started) */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("game.participants.leaveTeam")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("game.participants.leaveTeamStatsWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleRemoveUserFromTeam(currentUserId);
                setShowLeaveDialog(false);
              }}
              disabled={isPending}
            >
              {isPending
                ? t("game.actions.saving")
                : t("game.participants.leaveTeam")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Team Confirmation Dialog */}
      <AlertDialog
        open={showRemoveTeamDialog}
        onOpenChange={setShowRemoveTeamDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("game.participants.removeTeam")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("game.participants.removeTeamConfirm", {
                teamName,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveTeam}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending
                ? t("game.actions.deleting")
                : t("game.participants.removeTeam")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog
        open={userToRemove !== null}
        onOpenChange={(open) => {
          if (!open) setUserToRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("game.participants.removeMember")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToRemove
                ? t("game.participants.removeMemberConfirm", {
                    userName: userToRemove.displayName,
                  })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (userToRemove) {
                  handleRemoveUserFromTeam(userToRemove.id);
                }
              }}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending
                ? t("game.actions.deleting")
                : t("game.participants.removeParticipant")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface RosterRowProps {
  user: UserRef;
  isCurrentUser: boolean;
  isEditor: boolean;
  isPending: boolean;
  onRemove: () => void;
}

function RosterRow({
  user,
  isCurrentUser,
  isEditor,
  isPending,
  onRemove,
}: RosterRowProps) {
  const t = useTranslations();

  return (
    <div
      className={cn(
        "group/roster-row flex items-center gap-3 py-2.5 px-1",
        isCurrentUser && "bg-secondary rounded-md",
      )}
    >
      <UserAvatar user={user} size="default" loading="lazy" />

      <Link
        href={`/user/${user.username}`}
        className="text-sm text-foreground hover:text-primary active:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm truncate"
      >
        {user.displayName}
      </Link>

      {isCurrentUser && (
        <Badge
          variant="secondary"
          aria-label={t("game.participants.currentUser")}
          className="shrink-0"
        >
          {t("game.participants.currentUser")}
        </Badge>
      )}

      <div className="ml-auto flex items-center gap-1 shrink-0">
        {/* Mobile chevron: visible by default, hidden on hover-capable devices */}
        <ChevronRight
          className="size-3.5 text-muted-foreground [@media(hover:hover)]:hidden"
          aria-hidden="true"
        />

        {/* Remove button: hidden by default on hover-capable, shown on hover/focus-within. Always visible on touch */}
        {isEditor && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            disabled={isPending}
            aria-label={t("game.participants.removeMember")}
            className={cn(
              "min-h-11 min-w-11",
              "[@media(hover:hover)]:hidden [@media(hover:hover)]:group-hover/roster-row:flex [@media(hover:hover)]:group-focus-within/roster-row:flex",
            )}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
