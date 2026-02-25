"use client";

import { FriendAvatars } from "@/components/game/friend-avatars";
import { GameScore } from "@/components/game/score/game-score";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TypographyMuted, TypographySmall } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import {
  GameStatusBadgeVariant,
  getSportIconPath,
  getSubtypeFromMetadata,
} from "@/lib/constants";
import type { FeedLocation, ViewerFriendPlayers } from "@/lib/types/feed";
import type {
  GameNode,
  IndividualParticipantNode,
  TeamInstanceNode,
} from "@/lib/types/game";
import { snakeToCamel } from "@/lib/utils";
import { Calendar, MapPin } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Image from "next/image";

function getLocationText(location: {
  name: string | null;
  address: { city: string; state: string; country: string };
}): string {
  const { city, state, country } = location.address;
  if (city) return state ? `${city}, ${state}` : city;
  if (state) return `${state}, ${country}`;
  return country;
}

interface GameCardProps {
  game: GameNode & {
    location?: FeedLocation | null;
    viewerFriendPlayers?: ViewerFriendPlayers;
  };
}

export function GameCard({ game }: GameCardProps) {
  const t = useTranslations();
  const format = useFormatter();

  const formattedDate = format.dateTime(new Date(game.startDate), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const participants = game.participants.edges.map((e) => e.node);

  const getParticipantsDisplay = () => {
    if (participants.length === 0) {
      return t("game.participants.noParticipants");
    }

    const firstParticipant = participants[0];
    if (firstParticipant.__typename === "TeamInstance") {
      const teamNames = participants
        .filter((p): p is TeamInstanceNode => p.__typename === "TeamInstance")
        .map((p) => p.name)
        .slice(0, 2);

      if (participants.length > 2) {
        return `${teamNames.join(` ${t("profile.games.vs")} `)} +${participants.length - 2}`;
      }
      return teamNames.join(` ${t("profile.games.vs")} `);
    } else {
      const playerNames = participants
        .filter(
          (p): p is IndividualParticipantNode =>
            p.__typename === "IndividualParticipant",
        )
        .map((p) =>
          p.player ? `${p.player.firstName} ${p.player.lastName}` : "Unknown",
        )
        .slice(0, 2);

      if (participants.length > 2) {
        return `${playerNames.join(` ${t("profile.games.vs")} `)} +${participants.length - 2}`;
      }
      return playerNames.join(` ${t("profile.games.vs")} `);
    }
  };

  const locationText = game.location ? getLocationText(game.location) : null;

  const subtype = getSubtypeFromMetadata(game.metadata);

  return (
    <Link href={`/game/${game.id}`} className="block">
      <Card className="hover:bg-muted/50 transition-colors">
        <CardContent className="space-y-3 p-4 sm:p-6">
          {/* Friend context — only shown when data is present */}
          {game.viewerFriendPlayers && (
            <FriendAvatars
              friends={game.viewerFriendPlayers.nodes}
              totalCount={game.viewerFriendPlayers.totalCount}
              sportType={game.sportType}
            />
          )}

          {/* Sport info row */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Image
                src={getSportIconPath(game.sportType)}
                alt={t(`sports.${game.sportType}`)}
                width={20}
                height={20}
                className="h-5 w-5"
              />
            </div>
            <Badge variant="outline">{t(`sportSubtypes.${subtype}`)}</Badge>
            <Badge
              variant={
                GameStatusBadgeVariant[game.gameStatus] as
                  | "default"
                  | "secondary"
                  | "outline"
              }
            >
              {t(`game.status.${snakeToCamel(game.gameStatus.toLowerCase())}`)}
            </Badge>
          </div>

          {/* Participants & Score */}
          <div className="space-y-1">
            <TypographySmall>{getParticipantsDisplay()}</TypographySmall>
            <div className="text-sm font-semibold text-primary">
              <GameScore
                sportType={game.sportType}
                participants={participants}
              />
            </div>
          </div>

          {/* Date & Location */}
          <div className="flex flex-wrap items-center gap-4">
            <TypographyMuted className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formattedDate}
            </TypographyMuted>
            {locationText && (
              <TypographyMuted className="flex items-center gap-1 min-w-0">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{locationText}</span>
              </TypographyMuted>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
