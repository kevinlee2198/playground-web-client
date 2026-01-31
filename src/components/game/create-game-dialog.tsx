"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CreateGameForm } from "./create-game-form";

export function CreateGameDialog() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{t("game.actions.create")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("game.createTitle")}</DialogTitle>
        </DialogHeader>
        <CreateGameForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
