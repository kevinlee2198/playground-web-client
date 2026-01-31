"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { GameStatusBadgeVariant, getSportIconPath } from "@/lib/constants";
import type {
  GameNode,
  IndividualParticipantNode,
  TeamInstanceNode,
} from "@/lib/types/game";
import { snakeToCamel } from "@/lib/utils";
import { Calendar } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

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
    hour: "2-digit",
    minute: "2-digit",
  });

  // Get participant display text
  const getParticipantsDisplay = () => {
    const participants = game.participants.edges.map((e) => e.node);

    if (participants.length === 0) {
      return t("game.participants.noParticipants");
    }

    // Check if team-based or individual
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
      // Individual participants
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

  return (
    <Link
      href={`/game/${game.id}`}
      className="block transition-transform hover:scale-[1.01]"
    >
      <Card className="h-full hover:bg-muted/50 transition-colors">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              {/* Sport Icon */}
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <img
                  src={getSportIconPath(game.sportType)}
                  alt={game.sportType}
                  className="h-6 w-6"
                />
              </div>
              <div>
                <CardTitle className="text-base">
                  {t(`sports.${game.sportType}`)}
                </CardTitle>
                <CardDescription className="text-sm">
                  {t(`sportSubtypes.${game.sportSubtype}`)}
                </CardDescription>
              </div>
            </div>
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
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {formattedDate}
          </div>
          <div className="text-sm font-medium">{getParticipantsDisplay()}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
