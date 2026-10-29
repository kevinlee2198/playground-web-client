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
import type { GameDetail } from "@/lib/types/game";
import { Lock, LockOpen, MoreHorizontal, Pencil, Play, Square, Trash2, UserPlus, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";
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

  const { viewerCan } = game;
  const hasMenuItem =
    viewerCan.update ||
    viewerCan.invite ||
    viewerCan.unfinalizeResults ||
    viewerCan.finalizeResults ||
    viewerCan.manageEditors ||
    viewerCan.delete;
  if (!viewerCan.start && !viewerCan.end && !hasMenuItem) return null;

  function handleGameAction(
    action: (id: number) => Promise<{ success: boolean; message?: string }>,
    successKey: string,
    errorKey: string,
  ): void {
    startTransition(async () => {
      const result = await action(game.id);
      if (result.success) {
        toast.add({ title: t(successKey), type: "success" });
      } else {
        toast.add({ title: result.message || t(errorKey), type: "error" });
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
        {viewerCan.start && (
          <Button
            onClick={handleStart}
            disabled={isPending}
            className="flex-1 md:flex-none w-full min-h-11 md:w-auto"
          >
            <Play className="mr-2 h-4 w-4" />
            {isPending ? t("game.actions.starting") : t("game.actions.start")}
          </Button>
        )}
        {viewerCan.end && (
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
        {hasMenuItem && (
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
            {viewerCan.update && (
              <DropdownMenuItem onClick={() => setShowUpdateDialog(true)}>
                <Pencil className="h-4 w-4" />
                {t("game.actions.edit")}
              </DropdownMenuItem>
            )}
            {viewerCan.invite && (
              <DropdownMenuItem onClick={() => setShowInviteDialog(true)}>
                <UserPlus className="h-4 w-4" />
                {t("game.invitations.inviteUsers")}
              </DropdownMenuItem>
            )}
            {viewerCan.unfinalizeResults && (
              <DropdownMenuItem onClick={handleUnfinalize} disabled={isPending}>
                <LockOpen className="h-4 w-4" />
                {isPending ? t("game.actions.unfinalizing") : t("game.actions.unfinalizeResults")}
              </DropdownMenuItem>
            )}
            {viewerCan.finalizeResults && (
              <DropdownMenuItem onClick={handleFinalize} disabled={isPending}>
                <Lock className="h-4 w-4" />
                {isPending ? t("game.actions.finalizing") : t("game.actions.finalizeResults")}
              </DropdownMenuItem>
            )}
            {viewerCan.manageEditors && (
              <DropdownMenuItem onClick={() => setShowEditorsDialog(true)}>
                <Users className="h-4 w-4" />
                {t("game.manageEditors")}
              </DropdownMenuItem>
            )}
            {viewerCan.delete && (
              <>
                {(viewerCan.update ||
                  viewerCan.invite ||
                  viewerCan.unfinalizeResults ||
                  viewerCan.finalizeResults ||
                  viewerCan.manageEditors) && <DropdownMenuSeparator />}
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
        )}
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
