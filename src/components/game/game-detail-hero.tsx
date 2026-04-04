import { GameDescription } from "@/components/game/game-description";
import { GameHeroContent } from "@/components/game/live/game-hero-content";
import { SportBadge } from "@/components/game/sport-badge";
import { Badge } from "@/components/ui/badge";
import { TypographyMuted } from "@/components/ui/typography";
import { GameVisibility, getFormatFromMetadata, getSportGradientClass } from "@/lib/constants";
import type { GameDetail } from "@/lib/types/game";
import { cn } from "@/lib/utils";
import { Calendar, Lock, MapPin } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

interface GameDetailHeroProps {
  game: GameDetail;
  locationText: string | null;
}

export async function GameDetailHero({
  game,
  locationText,
}: GameDetailHeroProps) {
  const t = await getTranslations();
  const format = await getFormatter();

  const sportFormat = getFormatFromMetadata(game.metadata);

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
        getSportGradientClass(game.sportType),
      )}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Sport info row: badge + format badge */}
        <div className="flex items-center justify-center gap-2">
          <SportBadge sportType={game.sportType} />
          {sportFormat != null && (
            <Badge variant="outline" className="text-xs">
              {t(`sportFormats.${sportFormat}`)}
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
