import { GameDescription } from "@/components/game/game-description";
import { GameHeroContent } from "@/components/game/live/game-hero-content";
import { getParticipantName } from "@/components/game/score/participant-utils";
import { SportBadge } from "@/components/game/sport-badge";
import { SportIcon } from "@/components/game/sport-icon";
import { Badge } from "@/components/ui/badge";
import { TypographyLarge, TypographyMuted } from "@/components/ui/typography";
import {
  GameStatus,
  GameVisibility,
  getFormatFromMetadata,
  getSportFgClass,
  getSportWashClass,
} from "@/lib/constants";
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

  // Headline: game title once the schema has one, else matchup (mirrors
  // game-card.tsx). Live/final games already lead with names in the score
  // block, so the headline only renders for scheduled games.
  const participants = game.participants.edges.map((e) => e.node);
  const unnamedTeam = t("leagues.team.unnamed");
  const matchup =
    participants.length >= 2
      ? `${getParticipantName(participants[0], unnamedTeam)} ${t("profile.games.vs")} ${getParticipantName(participants[1], unnamedTeam)}`
      : null;

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
        "relative overflow-hidden rounded-3xl p-6 sm:p-8",
        getSportWashClass(game.sportType),
      )}
    >
      {/* Oversized sport watermark */}
      <SportIcon
        sportType={game.sportType}
        className={cn(
          "pointer-events-none absolute -bottom-12 -right-10 size-52 opacity-[0.09] dark:opacity-[0.12]",
          getSportFgClass(game.sportType),
        )}
      />
      <div className="relative flex flex-col items-center gap-4">
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

        {game.gameStatus === GameStatus.SCHEDULED && matchup ? (
          <TypographyLarge className="text-2xl font-bold font-heading text-pretty text-center">
            {matchup}
          </TypographyLarge>
        ) : null}

        {/* Game description */}
        {game.description ? (
          <GameDescription description={game.description} />
        ) : null}

        {/* Reactive score block or scheduled date */}
        <GameHeroContent game={game} formattedDate={formattedDate} />

        {/* Venue and date metadata — date omitted when GameHeroContent already shows it */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {game.gameStatus !== GameStatus.SCHEDULED ? (
            <TypographyMuted className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              {formattedDate}
            </TypographyMuted>
          ) : null}
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
