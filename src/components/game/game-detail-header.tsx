"use client";

import { startGame, endGame } from "@/app/[locale]/game/actions";
import { Button } from "@/components/ui/button";
import { GameStatusBadge } from "./game-status-badge";
import { DeleteGameDialog } from "./delete-game-dialog";
import type { GameDetail } from "@/lib/types/game";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Play, StopCircle, Pencil } from "lucide-react";

interface GameDetailHeaderProps {
  game: GameDetail;
  currentPlayerId: number;
}

export function GameDetailHeader({ game }: GameDetailHeaderProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const sportText = t(`sports.${game.sportType}`);
  const subtypeText = t(`sportSubtypes.${game.sportSubtype}`);

  const handleStart = () => {
    startTransition(async () => {
      const result = await startGame(game.id);
      if (result.success) {
        toast.success(t("game.success.started"));
      } else {
        toast.error(result.error || t("game.errors.startError"));
      }
    });
  };

  const handleEnd = () => {
    startTransition(async () => {
      const result = await endGame(game.id);
      if (result.success) {
        toast.success(t("game.success.ended"));
      } else {
        toast.error(result.error || t("game.errors.endError"));
      }
    });
  };

  const canStart = game.gameStatus === "SCHEDULED";
  const canEnd = game.gameStatus === "IN_PROGRESS";

  return (
    <div className="mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {sportText} - {subtypeText}
          </h1>
          <div className="mt-2">
            <GameStatusBadge status={game.gameStatus} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canStart && (
            <Button
              onClick={handleStart}
              disabled={isPending}
              variant="default"
            >
              <Play className="mr-2 h-4 w-4" />
              {isPending ? t("game.actions.starting") : t("game.actions.start")}
            </Button>
          )}
          {canEnd && (
            <Button
              onClick={handleEnd}
              disabled={isPending}
              variant="default"
            >
              <StopCircle className="mr-2 h-4 w-4" />
              {isPending ? t("game.actions.ending") : t("game.actions.end")}
            </Button>
          )}
          <Button variant="outline" disabled>
            <Pencil className="mr-2 h-4 w-4" />
            {t("game.actions.edit")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isPending}
          >
            {t("game.actions.delete")}
          </Button>
        </div>
      </div>

      <DeleteGameDialog
        gameId={game.id}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </div>
  );
}
