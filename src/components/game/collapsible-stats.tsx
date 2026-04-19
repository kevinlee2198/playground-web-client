"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

interface CollapsibleStatsProps {
  teamName: string;
  memberCount: number;
  defaultOpen: boolean;
  children: ReactNode;
}

export function CollapsibleStats({
  teamName,
  memberCount,
  defaultOpen,
  children,
}: CollapsibleStatsProps) {
  const t = useTranslations("game.stats");

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger
        className={cn(
          "group flex w-full items-center justify-between rounded-lg px-4 py-3",
          "bg-card shadow-card hover:bg-muted/50 transition-colors",
          "min-h-11 cursor-pointer",
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold tracking-tight font-heading">
            {teamName}
          </span>
          <span className="text-sm text-muted-foreground">
            {t("memberCount", { count: memberCount })}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-muted-foreground",
            "transition-transform duration-200 motion-reduce:duration-0",
            "group-data-[panel-open]:rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
