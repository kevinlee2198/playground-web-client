"use client";

import { endGame, finalizeGameResults, startGame, unfinalizeGameResults } from "@/app/[locale]/game/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GameRole, GameStatus } from "@/lib/constants";
import type { GameDetail } from "@/lib/types/game";
import { Lock, LockOpen, MoreHorizontal, Pencil, Play, Square, Trash2, UserPlus, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DeleteGameDialog } from "./delete-game-dialog";
import { InviteUsersDialog } from "./invite-users-dialog";
import { ManageEditorsDialog } from "./manage-editors-dialog";
import { UpdateGameForm } from "./update-game-form";

interface GameDetailActionsProps {
  game: GameDetail;
}

export function GameDetailActions({ game }: GameDetailActionsProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showEditorsDialog, setShowEditorsDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  if (game.viewerGameRole == null) return null;

  const canStart = game.gameStatus === GameStatus.SCHEDULED;
  const canEnd = game.gameStatus === GameStatus.IN_PROGRESS;
  const isOwner = game.viewerGameRole === GameRole.OWNER;
  const canFinalize = game.gameStatus === GameStatus.COMPLETE;
  const canUnfinalize = game.gameStatus === GameStatus.FINALIZED;

  function handleGameAction(
    action: (id: number) => Promise<{ success: boolean; message?: string }>,
    successKey: string,
    errorKey: string,
  ): void {
    startTransition(async () => {
      const result = await action(game.id);
      if (result.success) {
        toast.success(t(successKey));
      } else {
        toast.error(result.message || t(errorKey));
      }
    });
  }

  function handleStart(): void {
    handleGameAction(startGame, "game.success.started", "game.errors.startError");
  }

  function handleEnd(): void {
    handleGameAction(endGame, "game.success.ended", "game.errors.endError");
  }

  function handleFinalize(): void {
    handleGameAction(
      finalizeGameResults,
      "game.success.resultsFinalized",
      "game.errors.finalizeError",
    );
  }

  function handleUnfinalize(): void {
    handleGameAction(
      unfinalizeGameResults,
      "game.success.resultsUnfinalized",
      "game.errors.unfinalizeError",
    );
  }

  return (
    <>
      <div className="mt-4 flex items-center gap-2">
        {/* Primary CTA: Start/End Game */}
        {canStart && (
          <Button
            onClick={handleStart}
            disabled={isPending}
            className="flex-1 md:flex-none w-full min-h-11 md:w-auto"
          >
            <Play className="mr-2 h-4 w-4" />
            {isPending ? t("game.actions.starting") : t("game.actions.start")}
          </Button>
        )}
        {canEnd && (
          <Button
            onClick={handleEnd}
            disabled={isPending}
            className="flex-1 md:flex-none w-full min-h-11 md:w-auto"
          >
            <Square className="mr-2 h-4 w-4" />
            {isPending ? t("game.actions.ending") : t("game.actions.end")}
          </Button>
        )}

        {/* Overflow menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                disabled={isPending}
                aria-label={t("game.actions.moreOptions")}
                className="ml-auto min-h-11 min-w-11"
              />
            }
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowUpdateDialog(true)}>
              <Pencil className="h-4 w-4" />
              {t("game.actions.edit")}
            </DropdownMenuItem>
            {game.gameStatus !== GameStatus.COMPLETE && game.gameStatus !== GameStatus.FINALIZED && (
              <DropdownMenuItem onClick={() => setShowInviteDialog(true)}>
                <UserPlus className="h-4 w-4" />
                {t("game.invitations.inviteUsers")}
              </DropdownMenuItem>
            )}
            {canUnfinalize && (
              <DropdownMenuItem onClick={handleUnfinalize} disabled={isPending}>
                <LockOpen className="h-4 w-4" />
                {isPending ? t("game.actions.unfinalizing") : t("game.actions.unfinalizeResults")}
              </DropdownMenuItem>
            )}
            {canFinalize && (
              <DropdownMenuItem onClick={handleFinalize} disabled={isPending}>
                <Lock className="h-4 w-4" />
                {isPending ? t("game.actions.finalizing") : t("game.actions.finalizeResults")}
              </DropdownMenuItem>
            )}
            {isOwner && (
              <>
                <DropdownMenuItem onClick={() => setShowEditorsDialog(true)}>
                  <Users className="h-4 w-4" />
                  {t("game.manageEditors")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("game.actions.delete")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dialogs */}
      <DeleteGameDialog
        gameId={game.id}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />

      <ManageEditorsDialog
        gameId={game.id}
        open={showEditorsDialog}
        onOpenChange={setShowEditorsDialog}
      />

      <InviteUsersDialog
        gameId={game.id}
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
      />

      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("game.actions.edit")}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("game.actions.edit")}
            </DialogDescription>
          </DialogHeader>
          <UpdateGameForm
            gameId={game.id}
            currentStartDate={game.startDate}
            metadata={game.metadata}
            sportType={game.sportType}
            currentLocation={game.location}
            currentVisibility={game.visibility}
            currentStatEntryMode={game.statEntryMode}
            onSuccess={() => setShowUpdateDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
