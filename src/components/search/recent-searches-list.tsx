"use client";

import { Button } from "@/components/ui/button";
import { TypographyMuted, TypographySmall } from "@/components/ui/typography";
import { Clock, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface RecentSearchesListProps {
  searches: string[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClearAll: () => void;
}

export function RecentSearchesList({
  searches,
  onSelect,
  onRemove,
  onClearAll,
}: RecentSearchesListProps) {
  const t = useTranslations("search");

  if (searches.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2">
        <TypographyMuted className="text-xs font-medium uppercase tracking-wide">
          {t("recent")}
        </TypographyMuted>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-primary hover:underline"
        >
          {t("clearAll")}
        </button>
      </div>
      <div className="divide-y">
        {searches.map((query) => (
          <div
            key={query}
            className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted"
          >
            <button
              type="button"
              className="flex flex-1 items-center gap-2 text-left"
              onClick={() => onSelect(query)}
            >
              <Clock
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <TypographySmall>{query}</TypographySmall>
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove "${query}" from recent searches`}
              onClick={() => onRemove(query)}
              className="ml-2 shrink-0 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
