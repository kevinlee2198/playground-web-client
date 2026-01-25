"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { GameStatusBadgeVariant, getSportIconPath } from "@/lib/constants";
import type {
  GameNode,
  IndividualParticipantNode,
  TeamInstanceNode,
} from "@/lib/types/game";
import { Calendar } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { TypographyP } from "../ui/typography";

interface GameCardProps {
  game: GameNode;
}

export function GameCard({ game }: GameCardProps) {
  const t = useTranslations();
  const format = useFormatter();

  const formattedDate = format.dateTime(new Date(game.startDate), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Get participant display text based on type
  const getParticipantsDisplay = () => {
    const participants = game.participants.edges.map((e) => e.node);

    if (participants.length === 0) return "TBD";

    // Check if team-based or individual
    const firstParticipant = participants[0];
    if (firstParticipant.__typename === "TeamInstance") {
      const teamNames = participants
        .filter((p): p is TeamInstanceNode => p.__typename === "TeamInstance")
        .map((p) => p.name);
      return teamNames.join(` ${t("profile.games.vs")} `);
    } else {
      // Individual participants
      const playerNames = participants
        .filter(
          (p): p is IndividualParticipantNode =>
            p.__typename === "IndividualParticipant",
        )
        .map((p) =>
          p.player ? `${p.player.firstName} ${p.player.lastName}` : "Unknown",
        )
        .join(` ${t("profile.games.vs")} `);
      return playerNames;
    }
  };

  return (
    <Link href={`/game/${game.id}`}>
      <Card className="cursor-pointer transition-colors hover:bg-muted/50">
        <CardContent className="flex items-center gap-4 p-4">
          {/* Sport Icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <img
              src={getSportIconPath(game.sportType)}
              alt={game.sportType}
              className="w-8 h-8"
            />
          </div>

          {/* Game Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {t(`sports.${game.sportType}`)}
              </span>
              <Badge variant="outline">
                {t(`sportSubtypes.${game.sportSubtype}`)}
              </Badge>
              <Badge variant={GameStatusBadgeVariant[game.gameStatus]}>
                {t(`profile.games.status.${game.gameStatus.toLowerCase()}`)}
              </Badge>
            </div>
            <TypographyP className="text-sm text-muted-foreground">
              {getParticipantsDisplay()}
            </TypographyP>
          </div>

          {/* Date */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {formattedDate}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
