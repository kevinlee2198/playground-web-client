"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useScrollDirectionContext } from "./scroll-direction-provider";

function isFabPage(pathname: string): boolean {
  if (pathname === "/" || pathname === "" || pathname === "/games") return true;
  if (pathname === "/games/new") return false;
  return pathname.startsWith("/games/");
}

export function NewGameFab(): ReactNode {
  const { data: session } = useSession();
  const pathname = usePathname();
  const t = useTranslations();
  const { direction, isPullGestureActive } = useScrollDirectionContext();

  if (!session?.user) return null;
  if (!isFabPage(pathname)) return null;

  // Suppressed during pull-to-refresh gesture
  const isHidden = !isPullGestureActive && direction === "down";

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
      <Link
        href="/games/new"
        aria-label={t("nav.newGame")}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground",
          "shadow-[0_16px_32px_rgba(61,52,38,0.14),0_6px_12px_rgba(61,52,38,0.08)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "active:scale-95 active:transition-transform active:duration-100",
        )}
      >
        <Plus size={24} strokeWidth={2.5} />
      </Link>
    </div>
  );
}
