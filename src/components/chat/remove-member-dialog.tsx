"use client";

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
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface RemoveMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  onConfirm: () => void;
  isRemoving: boolean;
}

export function RemoveMemberDialog({
  open,
  onOpenChange,
  memberName,
  onConfirm,
  isRemoving,
}: RemoveMemberDialogProps) {
  const t = useTranslations("chat.members");
  const tMessage = useTranslations("chat.message");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("remove")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("removeConfirm", { name: memberName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>
            {tMessage("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isRemoving}
            variant="destructive"
          >
            {isRemoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("remove")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
