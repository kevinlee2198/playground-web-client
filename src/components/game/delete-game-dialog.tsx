"use client";

import { deleteGame } from "@/app/[locale]/game/actions";
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
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

interface DeleteGameDialogProps {
  gameId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteGameDialog({
  gameId,
  open,
  onOpenChange,
}: DeleteGameDialogProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteGame(gameId);
      if (result.success) {
        toast.success(t("game.success.deleted"));
        router.push("/games");
      } else {
        toast.error(result.error || t("game.errors.deleteError"));
        onOpenChange(false);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("game.deleteConfirmation.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("game.deleteConfirmation.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("game.deleteConfirmation.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending}>
            {isPending
              ? t("game.actions.deleting")
              : t("game.deleteConfirmation.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
