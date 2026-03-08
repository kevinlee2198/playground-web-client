"use client";

import { createPlayer, updatePlayer } from "@/app/[locale]/player/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMode } from "@/lib/constants";
import type {
  CreatePlayerInput,
  Player,
  UpdatePlayerInput,
} from "@/lib/types/player";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CreatePlayerForm } from "./create-player-form";
import { PlayerView } from "./player-view";
import { UpdatePlayerForm } from "./update-player-form";

interface PlayerProfileCardProps {
  initialPlayer: Player | null;
  userDefaults: { firstName: string; lastName: string };
}

export function PlayerProfileCard({
  initialPlayer,
  userDefaults,
}: PlayerProfileCardProps) {
  const t = useTranslations();
  const [player, setPlayer] = useState<Player | null>(initialPlayer);
  const [mode, setMode] = useState(
    initialPlayer ? FormMode.VIEW : FormMode.CREATE,
  );
  const [isPending, startTransition] = useTransition();

  const handleCreate = async (data: CreatePlayerInput) => {
    startTransition(async () => {
      const result = await createPlayer(data);
      if (result.success && result.player) {
        setPlayer(result.player);
        setMode(FormMode.VIEW);
        toast.success(t("player.success.created"));
      } else {
        toast.error(result.message || t("player.errors.createError"));
      }
    });
  };

  const handleUpdate = async (data: UpdatePlayerInput) => {
    startTransition(async () => {
      const result = await updatePlayer(data);
      if (result.success && result.player) {
        setPlayer(result.player);
        setMode(FormMode.VIEW);
        toast.success(t("player.success.updated"));
      } else {
        toast.error(result.message || t("player.errors.updateError"));
      }
    });
  };

  const handleEdit = () => {
    setMode(FormMode.EDIT);
  };

  const handleCancel = () => {
    setMode(FormMode.VIEW);
  };

  const title =
    mode === FormMode.CREATE
      ? t("player.createTitle")
      : mode === FormMode.EDIT
        ? t("player.editTitle")
        : t("player.title");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {mode === FormMode.VIEW && player ? (
          <PlayerView player={player} onEdit={handleEdit} />
        ) : mode === FormMode.CREATE ? (
          <CreatePlayerForm
            userDefaults={userDefaults}
            onSubmit={handleCreate}
            isPending={isPending}
          />
        ) : (
          <UpdatePlayerForm
            initialData={player!}
            onSubmit={handleUpdate}
            onCancel={handleCancel}
            isPending={isPending}
          />
        )}
      </CardContent>
    </Card>
  );
}
