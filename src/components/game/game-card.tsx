"use client";

import { BreathingDot } from "@/components/game/breathing-dot";
import { FollowingAvatars } from "@/components/game/following-avatars";
import { GameScore } from "@/components/game/score/game-score";
import { getParticipantName } from "@/components/game/score/participant-utils";
import { SportIcon } from "@/components/game/sport-icon";
import { Badge } from "@/components/ui/badge";
import { TypographyMuted } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import {
  GameInvitationStatus,
  GameStatus,
  GameStatusAriaLabelKey,
  GameStatusLabelKey,
  GameVisibility,
  getFormatFromMetadata,
  getSportFgClass,
  getSportWashClass,
} from "@/lib/constants";
import type { ViewerFollowingUsers } from "@/lib/types/feed";
import type { GameNode } from "@/lib/types/game";
import { formatDistance } from "@/lib/location-detection";
import { cn } from "@/lib/utils";
import { Calendar, Lock, MapPin } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import type { ReactNode } from "react";

function getLocationText(location: {
  name: string | null;
  address: { city: string; state: string | null; country: string };
}): string {
  const { city, state, country } = location.address;
  if (city) return state ? `${city}, ${state}` : city;
  if (state) return `${state}, ${country}`;
  return country;
}

interface GameCardProps {
  game: GameNode & {
    viewerFollowingUsers?: ViewerFollowingUsers;
  };
  /** Distance in meters from the search center. Null when not in a location search. */
  distance?: number | null;
}

const RECENT_FINAL_MS = 7 * 24 * 60 * 60 * 1000;

export function GameCard({ game, distance }: GameCardProps) {
  const t = useTranslations();
  const format = useFormatter();
  const now = useNow();

  const isLive = game.gameStatus === GameStatus.IN_PROGRESS;
  const isUpcoming = game.gameStatus === GameStatus.SCHEDULED;
  const isFinal = !isLive && !isUpcoming;

  const startDate = new Date(game.startDate);
  const formattedDate = format.dateTime(startDate, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // Recently finished games read as relative time ("yesterday"), older ones
  // fall back to the absolute date.
  const isRecent = now.getTime() - startDate.getTime() < RECENT_FINAL_MS;
  const metaDate =
    isFinal && isRecent ? format.relativeTime(startDate, now) : formattedDate;
  const shortDate = `${format.dateTime(startDate, { month: "short", day: "numeric" })} · ${format.dateTime(startDate, { hour: "2-digit", minute: "2-digit" })}`;

  const participants = game.participants.edges.map((e) => e.node);
  const locationText = game.location ? getLocationText(game.location) : null;
  const distanceText =
    distance != null && distance > 0 ? formatDistance(distance, "IMPERIAL") : null;
  const sportFormat = getFormatFromMetadata(game.metadata);
  const sportFgClass = getSportFgClass(game.sportType);
  const washClass = getSportWashClass(game.sportType);

  const sportLabel = t(`sports.${game.sportType}`);
  const formatLabel = sportFormat != null ? t(`sportFormats.${sportFormat}`) : null;
  const sportFormatLabel = formatLabel ? `${sportLabel} · ${formatLabel}` : sportLabel;

  const unnamedTeam = t("leagues.team.unnamed");
  const participantsDisplay = participants.length >= 2
    ? `${getParticipantName(participants[0], unnamedTeam)} ${t("profile.games.vs")} ${getParticipantName(participants[1], unnamedTeam)}`
    : null;
  // Headline: game title once the schema has one, else matchup, else sport + format.
  const headline = participantsDisplay ?? sportFormatLabel;

  // Status sits at the top-right of the head row and reads differently per state:
  // live pill, the scheduled start time, or a FINAL label.
  const statusAriaLabel = t(GameStatusAriaLabelKey[game.gameStatus]);
  let statusIndicator: ReactNode;
  if (isLive) {
    statusIndicator = (
      <Badge
        aria-label={statusAriaLabel}
        className="text-xs bg-live text-live-foreground gap-1.5"
      >
        <BreathingDot className="size-1.5" />
        {t(GameStatusLabelKey[game.gameStatus])}
      </Badge>
    );
  } else if (isUpcoming) {
    statusIndicator = (
      // The date stays in the accessible name — an aria-label of just the
      // status would hide the start time from screen readers entirely.
      <span
        aria-label={`${statusAriaLabel}, ${shortDate}`}
        className="text-xs font-semibold text-muted-foreground tabular-nums"
      >
        {shortDate}
      </span>
    );
  } else {
    statusIndicator = (
      <span
        aria-label={statusAriaLabel}
        className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground"
      >
        {t(GameStatusLabelKey[game.gameStatus])}
      </span>
    );
  }

  return (
    <Link href={`/game/${game.id}`} className="block group/game-card">
      <article
        className={cn(
          "relative overflow-hidden rounded-2xl bg-card text-card-foreground shadow-card transition-[transform,box-shadow] duration-[var(--duration-normal)] ease-[var(--ease-default)] touch-manipulation",
          "group-hover/game-card:-translate-y-0.5 group-hover/game-card:shadow-card-hover",
          washClass,
          isLive ? "border-2 border-live shadow-card-hover" : "border border-border",
        )}
      >
        {/* Live: the wash slowly breathes (opacity-only overlay) */}
        {isLive ? (
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 animate-wash-pulse motion-reduce:animate-none",
              washClass,
            )}
          />
        ) : null}

        {/* Oversized sport watermark */}
        <SportIcon
          sportType={game.sportType}
          className={cn(
            "pointer-events-none absolute -bottom-7 -right-6 size-36 opacity-[0.09] dark:opacity-[0.12]",
            sportFgClass,
          )}
        />

        <div className="relative space-y-3 p-4 sm:p-5">
          {/* Following context — only shown in feed when data is present */}
          {game.viewerFollowingUsers ? (
            <FollowingAvatars
              followingUsers={game.viewerFollowingUsers}
            />
          ) : null}

          {/* Head row: sport chip + secondary badges, status on the right */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 font-heading text-xs font-bold uppercase tracking-wider",
                  sportFgClass,
                )}
              >
                <SportIcon sportType={game.sportType} size="sm" />
                <span className="truncate">{sportFormatLabel}</span>
              </span>
              {game.viewerInvitation?.status === GameInvitationStatus.PENDING && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {t("game.badges.invited")}
                </Badge>
              )}
              {game.visibility !== GameVisibility.PUBLIC && (
                <Badge variant="outline" className="text-xs gap-1 shrink-0">
                  <Lock className="size-3" aria-hidden="true" />
                  {t(`game.visibility.${game.visibility.toLowerCase()}`)}
                </Badge>
              )}
            </div>
            <div className="shrink-0">{statusIndicator}</div>
          </div>

          {/* Headline (upcoming) or score block (live/final) */}
          {isUpcoming || participants.length < 2 ? (
            <p className="font-heading text-lg font-bold text-pretty">
              {headline}
            </p>
          ) : (
            <div
              aria-live={isLive ? "polite" : undefined}
              aria-atomic={isLive ? true : undefined}
            >
              <GameScore
                sportType={game.sportType}
                participants={participants}
                showWinner={!isLive}
              />
            </div>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {!isUpcoming ? (
              <TypographyMuted className="flex items-center gap-1">
                <Calendar className="size-3.5" aria-hidden="true" />
                {metaDate}
              </TypographyMuted>
            ) : null}
            {locationText || distanceText ? (
              <TypographyMuted className="flex items-center gap-1 min-w-0">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {locationText && distanceText
                    ? <>{locationText}{" · "}<span className="tabular-nums">{distanceText}</span></>
                    : locationText ?? <span className="tabular-nums">{distanceText}</span>}
                </span>
              </TypographyMuted>
            ) : null}
          </div>
        </div>
      </article>
    </Link>
  );
}
