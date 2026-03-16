"use client";

import { TypographyMuted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

interface GameDescriptionProps {
  description: string;
}

export function GameDescription({ description }: GameDescriptionProps) {
  const t = useTranslations("game.hero");
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      setIsClamped(el.scrollHeight > el.clientHeight);
    }
  }, [description]);

  return (
    <div className="flex flex-col items-center gap-1 w-full max-w-prose text-center">
      <div ref={textRef} className={cn(!expanded && "line-clamp-2")}>
        <TypographyMuted className="text-pretty">
          {description}
        </TypographyMuted>
      </div>
      {(isClamped || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
        >
          {expanded ? t("showLess") : t("showMore")}
        </button>
      )}
    </div>
  );
}
