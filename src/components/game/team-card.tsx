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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GameRole, GameStatus, GameVisibility } from "@/lib/constants";
import type { TeamInstanceDetail } from "@/lib/types/game";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface TeamCardProps {
  team: TeamInstanceDetail;
  gameId: number;
  gameStatus: GameStatus;
  currentPlayerId: number;
  isPlayerOnAnyTeam: boolean;
  viewerGameRole: GameRole | null;
  visibility: GameVisibility;
}

export function TeamCard({
  team,
  gameId,
  gameStatus,
  currentPlayerId,
  isPlayerOnAnyTeam,
  viewerGameRole,
  visibility,
}: TeamCardProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const isPlayerOnTeam = team.players.some((p) => p.id === currentPlayerId);
  const gameHasStarted =
    gameStatus === GameStatus.IN_PROGRESS || gameStatus === GameStatus.COMPLETE;

  const handleJoinTeam = () => {
    startTransition(async () => {
      const result = await joinTeam({
        teamInstanceId: team.id,
        playerId: currentPlayerId,
      });

      if (result.success) {
        toast.success(t("game.success.participantAdded"));
      } else {
        toast.error(result.message || t("game.errors.participantError"));
      }
    });
  };

  const handleLeaveTeam = () => {
    startTransition(async () => {
      const result = await leaveTeam({
        teamInstanceId: team.id,
        playerId: currentPlayerId,
      });

      if (result.success) {
        toast.success(t("game.success.participantRemoved"));
      } else {
        toast.error(result.message || t("game.errors.participantError"));
      }
    });
  };

  const handleRemoveTeam = () => {
    startTransition(async () => {
      const result = await removeTeamParticipant({
        teamInstanceId: team.id,
      });

      if (result.success) {
        toast.success(t("game.success.participantRemoved"));
        setShowRemoveDialog(false);
      } else {
        toast.error(result.message || t("game.errors.participantError"));
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{team.name}</CardTitle>
              {team.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {team.description}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {isPlayerOnTeam ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={
                    gameHasStarted
                      ? () => setShowLeaveDialog(true)
                      : handleLeaveTeam
                  }
                  disabled={isPending}
                >
                  {t("game.participants.leaveTeam")}
                </Button>
              ) : (
                !isPlayerOnAnyTeam && (viewerGameRole != null || visibility === GameVisibility.PUBLIC) && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleJoinTeam}
                    disabled={isPending}
                  >
                    {t("game.participants.joinTeam")}
                  </Button>
                )
              )}
              {viewerGameRole != null && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowRemoveDialog(true)}
                  disabled={isPending}
                >
                  {t("game.participants.removeTeam")}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {team.players.length > 0 ? (
            <div>
              <h4 className="mb-2 text-sm font-medium">
                {t("game.participants.players")}
              </h4>
              <ul className="space-y-1 text-sm">
                {team.players.map((player) => (
                  <li key={player.id}>
                    {player.firstName} {player.lastName}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("game.participants.noPlayers")}
            </p>
          )}
        </CardContent>
      </Card>

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
                handleLeaveTeam();
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
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("game.participants.removeTeam")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {team.name}? This action cannot be
              undone.
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
    </>
  );
}
