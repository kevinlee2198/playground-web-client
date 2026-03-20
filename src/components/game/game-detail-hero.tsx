import { GameDescription } from "@/components/game/game-description";
import { GameHeroContent } from "@/components/game/live/game-hero-content";
import { SportEmojiPill } from "@/components/game/sport-emoji-pill";
import { Badge } from "@/components/ui/badge";
import { TypographyMuted } from "@/components/ui/typography";
import { GameVisibility, getSubtypeFromMetadata } from "@/lib/constants";
import type { SportType } from "@/lib/constants";
import type { GameDetail } from "@/lib/types/game";
import { cn } from "@/lib/utils";
import { Calendar, Lock, MapPin } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

interface GameDetailHeroProps {
  game: GameDetail;
  locationText: string | null;
}

const sportGradientClass: Record<SportType, string> = {
  BASKETBALL: "bg-sport-basketball/5 dark:bg-sport-basketball/15",
  TENNIS: "bg-sport-tennis/5 dark:bg-sport-tennis/15",
  FOOTBALL: "bg-sport-football/5 dark:bg-sport-football/15",
  PICKLEBALL: "bg-sport-pickleball/5 dark:bg-sport-pickleball/15",
  BASEBALL: "bg-sport-baseball/5 dark:bg-sport-baseball/15",
};

export async function GameDetailHero({
  game,
  locationText,
}: GameDetailHeroProps) {
  const t = await getTranslations();
  const format = await getFormatter();

  const subtype = getSubtypeFromMetadata(game.metadata);

  const formattedDate = format.dateTime(new Date(game.startDate), {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section
      className={cn(
        "rounded-3xl p-6 sm:p-8",
        sportGradientClass[game.sportType],
      )}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Sport info row: emoji pill + subtype badge */}
        <div className="flex items-center justify-center gap-2">
          <SportEmojiPill sportType={game.sportType} />
          {subtype != null && (
            <Badge variant="outline" className="text-xs">
              {t(`sportSubtypes.${subtype}`)}
            </Badge>
          )}
          {game.visibility !== GameVisibility.PUBLIC && (
            <Badge variant="outline" className="text-xs gap-1">
              <Lock className="size-3" aria-hidden="true" />
              {t(`game.visibility.${game.visibility.toLowerCase()}`)}
            </Badge>
          )}
        </div>

        {/* Game description */}
        {game.description ? (
          <GameDescription description={game.description} />
        ) : null}

        {/* Reactive score block or scheduled date */}
        <GameHeroContent game={game} formattedDate={formattedDate} />

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
