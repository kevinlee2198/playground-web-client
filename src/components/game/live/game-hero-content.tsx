"use client";

import { BreathingDot } from "@/components/game/breathing-dot";
import { GameScoreBlock } from "@/components/game/game-score-block";
import { Badge } from "@/components/ui/badge";
import { TypographyLarge, TypographyMuted } from "@/components/ui/typography";
import {
  GameStatus,
  GameStatusAriaLabelKey,
  GameStatusBadgeVariant,
  GameStatusLabelKey,
} from "@/lib/constants";
import type { GameDetail } from "@/lib/types/game";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useGameLiveContext } from "./game-detail-client";

interface GameHeroContentProps {
  game: GameDetail;
  formattedDate: string;
}

export function GameHeroContent({ game, formattedDate }: GameHeroContentProps) {
  const t = useTranslations();
  const liveContext = useGameLiveContext();
  const liveGame = liveContext?.game ?? game;

  const isLive = liveGame.gameStatus === GameStatus.IN_PROGRESS;
  const badgeVariant = GameStatusBadgeVariant[liveGame.gameStatus];

  const statusPill = (
    <Badge
      variant={badgeVariant}
      aria-label={t(GameStatusAriaLabelKey[liveGame.gameStatus])}
      className={cn("text-xs", isLive && "bg-live text-live-foreground gap-1.5")}
    >
      {isLive ? <BreathingDot className="size-1.5" /> : null}
      {t(GameStatusLabelKey[liveGame.gameStatus])}
    </Badge>
  );

  if (liveGame.gameStatus === GameStatus.SCHEDULED) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <TypographyMuted>{t("game.detail.hero.scheduled")}</TypographyMuted>
        <TypographyLarge className="text-2xl font-bold font-heading">
          {formattedDate}
        </TypographyLarge>
        {statusPill}
      </div>
    );
  }

  return (
    <div
      className={cn(
        isLive && "rounded-2xl ring-1 ring-live/12 bg-secondary/80 p-4",
      )}
    >
      <GameScoreBlock game={liveGame} statusPill={statusPill} />
    </div>
  );
}
