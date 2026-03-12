"use client";

import { BreathingDot } from "@/components/game/breathing-dot";
import { FriendAvatars } from "@/components/game/friend-avatars";
import { GameScore } from "@/components/game/score/game-score";
import { getParticipantName } from "@/components/game/score/participant-utils";
import { SportAccentStrip } from "@/components/game/sport-accent-strip";
import { SportEmojiPill } from "@/components/game/sport-emoji-pill";
import { Badge } from "@/components/ui/badge";
import { TypographyMuted } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import {
  GameStatus,
  getSubtypeFromMetadata,
} from "@/lib/constants";
import type { ViewerFriendPlayers } from "@/lib/types/feed";
import type { GameNode } from "@/lib/types/game";
import { cn } from "@/lib/utils";
import { Calendar, MapPin } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

function getLocationText(location: {
  name: string | null;
  address: { city: string; state: string; country: string };
}): string {
  const { city, state, country } = location.address;
  if (city) return state ? `${city}, ${state}` : city;
  if (state) return `${state}, ${country}`;
  return country;
}

function getStatusBadgeVariant(
  status: GameStatus,
): "default" | "secondary" | "outline" {
  switch (status) {
    case GameStatus.IN_PROGRESS:
      return "default";
    case GameStatus.SCHEDULED:
      return "secondary";
    case GameStatus.COMPLETE:
      return "outline";
  }
}

function getStatusLabelKey(status: GameStatus): string {
  switch (status) {
    case GameStatus.IN_PROGRESS:
      return "game.status.live";
    case GameStatus.SCHEDULED:
      return "game.status.upcoming";
    case GameStatus.COMPLETE:
      return "game.status.final";
  }
}

interface GameCardProps {
  game: GameNode & {
    viewerFriendPlayers?: ViewerFriendPlayers;
  };
}

export function GameCard({ game }: GameCardProps) {
  const t = useTranslations();
  const format = useFormatter();

  const isLive = game.gameStatus === GameStatus.IN_PROGRESS;
  const isUpcoming = game.gameStatus === GameStatus.SCHEDULED;
  const isComplete = game.gameStatus === GameStatus.COMPLETE;

  const formattedDate = format.dateTime(new Date(game.startDate), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const participants = game.participants.edges.map((e) => e.node);
  const locationText = game.location ? getLocationText(game.location) : null;
  const subtype = getSubtypeFromMetadata(game.metadata);

  const statusPill = (
    <Badge
      variant={getStatusBadgeVariant(game.gameStatus)}
      className={cn(
        "text-xs",
        isLive ? "bg-live text-live-foreground gap-1.5" : null,
      )}
    >
      {isLive ? <BreathingDot className="size-1.5" /> : null}
      {t(getStatusLabelKey(game.gameStatus))}
    </Badge>
  );

  const participantsDisplay = participants.length >= 2
    ? `${getParticipantName(participants[0])} ${t("profile.games.vs")} ${getParticipantName(participants[1])}`
    : null;

  return (
    <Link href={`/game/${game.id}`} className="block group/game-card">
      <article
        className={cn(
          "overflow-hidden rounded-2xl bg-card text-card-foreground shadow-card transition-[transform,box-shadow] duration-[var(--duration-normal)] ease-[var(--ease-default)] touch-action-manipulation",
          "group-hover/game-card:-translate-y-0.5 group-hover/game-card:shadow-card-hover",
          isLive ? "ring-1 ring-live/12" : null,
          isUpcoming ? "border border-dashed border-border bg-card/80" : null,
          isComplete ? "ring-1 ring-foreground/10" : null,
        )}
      >
        {/* Sport accent strip */}
        <SportAccentStrip sportType={game.sportType} />

        <div className="space-y-3 p-4 sm:p-5">
          {/* Friend context — only shown in feed when data is present */}
          {game.viewerFriendPlayers ? (
            <FriendAvatars
              friends={game.viewerFriendPlayers.nodes}
              totalCount={game.viewerFriendPlayers.totalCount}
            />
          ) : null}

          {/* Sport info row: emoji pill + subtype */}
          <div className="flex items-center gap-2">
            <SportEmojiPill sportType={game.sportType} />
            <Badge variant="outline" className="text-xs">
              {t(`sportSubtypes.${subtype}`)}
            </Badge>
          </div>

          {/* Score block */}
          {isUpcoming ? (
            <div className="flex items-center justify-center py-4">
              <div className="text-center">
                {participantsDisplay ? (
                  <p className="text-sm font-semibold font-heading text-muted-foreground mb-2">
                    {participantsDisplay}
                  </p>
                ) : null}
                <p className="text-2xl font-bold font-heading">{formattedDate}</p>
                <div className="mt-2">{statusPill}</div>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "rounded-xl p-4",
                isLive ? "bg-secondary/80" : "bg-secondary",
              )}
              aria-live={isLive ? "polite" : undefined}
              aria-atomic={isLive ? true : undefined}
            >
              {participants.length >= 2 ? (
                <GameScore
                  sportType={game.sportType}
                  participants={participants}
                  statusPill={statusPill}
                />
              ) : (
                <div className="flex items-center justify-center py-2">
                  {statusPill}
                </div>
              )}
            </div>
          )}

          {/* Meta row — only for completed/live (upcoming already shows date) */}
          {!isUpcoming ? (
            <div className="flex flex-wrap items-center gap-4">
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
          ) : null}

          {/* Location for upcoming (date is already shown) */}
          {isUpcoming && locationText ? (
            <div className="flex items-center justify-center">
              <TypographyMuted className="flex items-center gap-1">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">{locationText}</span>
              </TypographyMuted>
            </div>
          ) : null}
        </div>

        {/* Live: bottom terracotta glow */}
        {isLive ? (
          <div aria-hidden="true" className="h-[2px] bg-live/20" />
        ) : null}
      </article>
    </Link>
  );
}
