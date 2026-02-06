"use client";

import { endGame, startGame } from "@/app/[locale]/game/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GameStatus, getSubtypeFromMetadata } from "@/lib/constants";
import type { GameDetail, GameMetadata } from "@/lib/types/game";
import { Pencil, Play, StopCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DeleteGameDialog } from "./delete-game-dialog";
import { GameStatusBadge } from "./game-status-badge";
import { UpdateGameForm } from "./update-game-form";

interface GameDetailHeaderProps {
  game: GameDetail;
  currentPlayerId: number;
}

export function GameDetailHeader({ game }: GameDetailHeaderProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  const sportText = t(`sports.${game.sportType}`);
  const subtypeText = t(
    `sportSubtypes.${getSubtypeFromMetadata(game.metadata)}`,
  );

  const getMetadataDescription = (metadata: GameMetadata): string | null => {
    switch (metadata.__typename) {
      case "BasketballGameMetadata":
      case "FootballGameMetadata":
        return metadata.periods
          ? t("game.metadata.periods", { count: metadata.periods })
          : null;
      case "TennisGameMetadata": {
        const parts: string[] = [
          t("game.metadata.bestOf", { count: metadata.bestOf }),
        ];
        parts.push(
          metadata.tiebreakFinalSet
            ? t("game.metadata.tiebreakFinalSet")
            : t("game.metadata.noTiebreakFinalSet"),
        );
        return parts.join(", ");
      }
      default:
        return null;
    }
  };

  const metadataDescription = getMetadataDescription(game.metadata);

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

  const canStart = game.gameStatus === GameStatus.SCHEDULED;
  const canEnd = game.gameStatus === GameStatus.IN_PROGRESS;

  return (
    <div className="mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {sportText} - {subtypeText}
          </h1>
          {metadataDescription && (
            <p className="mt-1 text-sm text-muted-foreground">
              {metadataDescription}
            </p>
          )}
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
            <Button onClick={handleEnd} disabled={isPending} variant="default">
              <StopCircle className="mr-2 h-4 w-4" />
              {isPending ? t("game.actions.ending") : t("game.actions.end")}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowUpdateDialog(true)}
            disabled={isPending}
          >
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

      {/* Update Game Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("game.actions.edit")}</DialogTitle>
          </DialogHeader>
          <UpdateGameForm
            gameId={game.id}
            currentStartDate={game.startDate}
            metadata={game.metadata}
            sportType={game.sportType}
            onSuccess={() => setShowUpdateDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
