"use client";

import { endGame, startGame } from "@/app/[locale]/game/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GameRole, GameStatus } from "@/lib/constants";
import type { GameDetail } from "@/lib/types/game";
import { Pencil, Play, Square, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DeleteGameDialog } from "./delete-game-dialog";
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

  if (game.viewerGameRole == null) return null;

  const canStart = game.gameStatus === GameStatus.SCHEDULED;
  const canEnd = game.gameStatus === GameStatus.IN_PROGRESS;

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

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {/* Primary actions: Start/End */}
        {canStart && (
          <Button
            onClick={handleStart}
            disabled={isPending}
            className="min-h-11"
          >
            <Play className="mr-2 h-4 w-4" />
            {isPending ? t("game.actions.starting") : t("game.actions.start")}
          </Button>
        )}
        {canEnd && (
          <Button
            onClick={handleEnd}
            disabled={isPending}
            className="min-h-11"
          >
            <Square className="mr-2 h-4 w-4" />
            {isPending ? t("game.actions.ending") : t("game.actions.end")}
          </Button>
        )}

        {/* Secondary actions: Edit, Manage Editors, Delete */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUpdateDialog(true)}
          disabled={isPending}
          className="min-h-11"
        >
          <Pencil className="mr-2 h-4 w-4" />
          {t("game.actions.edit")}
        </Button>

        {game.viewerGameRole === GameRole.OWNER && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditorsDialog(true)}
              disabled={isPending}
              className="min-h-11"
            >
              <Users className="mr-2 h-4 w-4" />
              {t("game.manageEditors")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isPending}
              className="min-h-11"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("game.actions.delete")}
            </Button>
          </>
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
            onSuccess={() => setShowUpdateDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
