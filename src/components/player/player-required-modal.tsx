"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface PlayerRequiredModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlayerRequiredModal({
  open,
  onOpenChange,
}: PlayerRequiredModalProps) {
  const t = useTranslations("player.modal");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button render={<Link href="/player" />}>{t("create")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
