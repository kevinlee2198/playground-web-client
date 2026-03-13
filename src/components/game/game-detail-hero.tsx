import { BreathingDot } from "@/components/game/breathing-dot";
import { GameScoreBlock } from "@/components/game/game-score-block";
import { SportEmojiPill } from "@/components/game/sport-emoji-pill";
import { Badge } from "@/components/ui/badge";
import { TypographyMuted } from "@/components/ui/typography";
import {
  GameStatus,
  GameStatusBadgeVariant,
  getSubtypeFromMetadata,
} from "@/lib/constants";
import type { SportType } from "@/lib/constants";
import type { GameDetail } from "@/lib/types/game";
import { cn } from "@/lib/utils";
import { Calendar, MapPin } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

interface GameDetailHeroProps {
  game: GameDetail;
  locationText: string | null;
}

const statusLabelKey: Record<GameStatus, string> = {
  [GameStatus.IN_PROGRESS]: "game.status.live",
  [GameStatus.SCHEDULED]: "game.status.upcoming",
  [GameStatus.COMPLETE]: "game.status.final",
};

const sportGradientClass: Record<SportType, string> = {
  BASKETBALL: "bg-sport-basketball/5 dark:bg-sport-basketball/15",
  TENNIS: "bg-sport-tennis/5 dark:bg-sport-tennis/15",
  FOOTBALL: "bg-sport-football/5 dark:bg-sport-football/15",
};

export async function GameDetailHero({
  game,
  locationText,
}: GameDetailHeroProps) {
  const t = await getTranslations();
  const format = await getFormatter();

  const isLive = game.gameStatus === GameStatus.IN_PROGRESS;
  const subtype = getSubtypeFromMetadata(game.metadata);
  const badgeVariant = GameStatusBadgeVariant[game.gameStatus];

  const formattedDate = format.dateTime(new Date(game.startDate), {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusPill = (
    <Badge
      variant={badgeVariant}
      className={cn(
        "text-xs",
        isLive && "bg-live text-live-foreground gap-1.5",
      )}
    >
      {isLive ? <BreathingDot className="size-1.5" /> : null}
      {t(statusLabelKey[game.gameStatus])}
    </Badge>
  );

  return (
    <section
      className={cn(
        "rounded-3xl p-6 sm:p-8",
        sportGradientClass[game.sportType],
        isLive && "ring-1 ring-live/12 bg-secondary/80",
      )}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Sport info row: emoji pill + subtype badge */}
        <div className="flex items-center justify-center gap-2">
          <SportEmojiPill sportType={game.sportType} />
          <Badge variant="outline" className="text-xs">
            {t(`sportSubtypes.${subtype}`)}
          </Badge>
        </div>

        {/* Score block or scheduled date */}
        {game.gameStatus === GameStatus.SCHEDULED ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <TypographyMuted>{t("game.detail.hero.scheduled")}</TypographyMuted>
            <p className="text-2xl font-bold font-heading">{formattedDate}</p>
            {statusPill}
          </div>
        ) : (
          <GameScoreBlock game={game} statusPill={statusPill} />
        )}

        {/* Venue and date metadata */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <TypographyMuted className="flex items-center gap-1">
            <Calendar className="size-3.5" />
            {formattedDate}
          </TypographyMuted>
          {locationText ? (
            <TypographyMuted className="flex items-center gap-1 min-w-0">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{locationText}</span>
            </TypographyMuted>
          ) : null}
        </div>
      </div>
    </section>
  );
}
