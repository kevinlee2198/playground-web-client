"use client";

import { usePathname } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { useScrollDirectionContext } from "./scroll-direction-provider";

const CreateGameForm = dynamic(
  () =>
    import("../game/create-game-form").then((m) => ({
      default: m.CreateGameForm,
    })),
  { ssr: false },
);

function isFabPage(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "" ||
    pathname === "/games" ||
    pathname.startsWith("/games/")
  );
}

export function NewGameFab(): ReactNode {
  const { data: session } = useSession();
  const pathname = usePathname();
  const t = useTranslations();
  const { direction } = useScrollDirectionContext();
  const [open, setOpen] = useState(false);

  if (!session?.user) return null;
  if (!isFabPage(pathname)) return null;

  const isHidden = direction === "down";

  return (
    <div
      className={cn(
        "lg:hidden",
        "fixed right-4 z-50",
        "bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)]",
        "transition-[transform,opacity] duration-250 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
        isHidden && "pointer-events-none translate-y-24 opacity-0",
      )}
    >
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <button
              aria-label={t("nav.newGame")}
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full",
                "bg-primary text-primary-foreground",
                "shadow-[0_16px_32px_rgba(61,52,38,0.14),0_6px_12px_rgba(61,52,38,0.08)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "active:scale-95 active:transition-transform active:duration-100",
              )}
            />
          }
        >
          <Plus size={24} strokeWidth={2.5} />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("game.createTitle")}</DialogTitle>
          </DialogHeader>
          <CreateGameForm onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
