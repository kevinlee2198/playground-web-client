"use client";

import { BasketballBoxScoreTable } from "@/components/game/basketball-box-score-table";
import { CollapsibleBoxScore } from "@/components/game/collapsible-box-score";
import { FootballDefensiveStatsTable } from "@/components/game/football-defensive-stats-table";
import { FootballOffensiveStatsTable } from "@/components/game/football-offensive-stats-table";
import { FootballSpecialTeamsStatsTable } from "@/components/game/football-special-teams-stats-table";
import { PickleballStatsTable } from "@/components/game/pickleball-stats-table";
import { TypographyH4 } from "@/components/ui/typography";
import { GameStatus, SportType } from "@/lib/constants";
import type {
  GameDetail,
  PlayerRef,
  TeamInstanceDetail,
} from "@/lib/types/game";
import type { BasketballBoxScoreNode } from "@/lib/types/stats/basketball";
import type { BoxScoreNode } from "@/lib/types/stats/base";
import type { PickleballStatisticsNode } from "@/lib/types/stats/pickleball";
import type {
  FootballDefensiveStatsNode,
  FootballOffensiveStatsNode,
  FootballSpecialTeamsStatsNode,
} from "@/lib/types/stats/football";
import { useTranslations } from "next-intl";

interface GameBoxScoresProps {
  game: GameDetail;
  boxScores?: { node: BasketballBoxScoreNode }[];
  pickleballStats?: { node: PickleballStatisticsNode }[];
  footballOffensiveStats?: { node: FootballOffensiveStatsNode }[];
  footballDefensiveStats?: { node: FootballDefensiveStatsNode }[];
  footballSpecialTeamsStats?: { node: FootballSpecialTeamsStatsNode }[];
}

interface TeamBoxScoreGroup<T extends BoxScoreNode> {
  teamName: string;
  players: PlayerRef[];
  boxScores: { node: T }[];
}

function groupByTeam<T extends BoxScoreNode>(
  game: GameDetail,
  allBoxScores: { node: T }[],
): TeamBoxScoreGroup<T>[] {
  const teams: {
    name: string;
    playerIds: Set<number>;
    players: PlayerRef[];
  }[] = [];

  for (const edge of game.participants.edges) {
    if (edge.node.__typename === "TeamInstance") {
      const team = edge.node as TeamInstanceDetail;
      teams.push({
        name: team.name,
        playerIds: new Set(team.players.map((p) => p.id)),
        players: team.players,
      });
    }
  }

  return teams.map((team) => ({
    teamName: team.name,
    players: team.players,
    boxScores: allBoxScores.filter((edge) =>
      team.playerIds.has(edge.node.player.id),
    ),
  }));
}

export function GameBoxScores({
  game,
  boxScores,
  pickleballStats,
  footballOffensiveStats,
  footballDefensiveStats,
  footballSpecialTeamsStats,
}: GameBoxScoresProps) {
  const t = useTranslations();

  if (
    game.sportType !== SportType.BASKETBALL &&
    game.sportType !== SportType.PICKLEBALL &&
    game.sportType !== SportType.FOOTBALL
  ) {
    return null;
  }

  if (game.gameStatus === GameStatus.SCHEDULED) {
    return null;
  }

  // Expand by default when the viewer is an owner/editor and the game is complete
  const defaultOpen =
    game.viewerGameRole != null && game.gameStatus === GameStatus.COMPLETE;

  if (game.sportType === SportType.FOOTBALL) {
    return (
      <div className="space-y-6">
        {footballOffensiveStats && footballOffensiveStats.length > 0 && (
          <div className="space-y-4 [content-visibility:auto] [contain-intrinsic-size:0_200px]">
            <TypographyH4>{t("game.boxScore.football.sections.offensive")}</TypographyH4>
            {groupByTeam(game, footballOffensiveStats).map((group) => (
              <CollapsibleBoxScore
                key={group.teamName}
                teamName={group.teamName}
                playerCount={group.boxScores.length || group.players.length}
                defaultOpen={defaultOpen}
              >
                <FootballOffensiveStatsTable
                  gameId={game.id}
                  teamName={group.teamName}
                  boxScores={group.boxScores}
                  gameStatus={game.gameStatus}
                  availablePlayers={group.players}
                  viewerGameRole={game.viewerGameRole}
                />
              </CollapsibleBoxScore>
            ))}
          </div>
        )}
        {footballDefensiveStats && footballDefensiveStats.length > 0 && (
          <div className="space-y-4 [content-visibility:auto] [contain-intrinsic-size:0_200px]">
            <TypographyH4>{t("game.boxScore.football.sections.defensive")}</TypographyH4>
            {groupByTeam(game, footballDefensiveStats).map((group) => (
              <CollapsibleBoxScore
                key={group.teamName}
                teamName={group.teamName}
                playerCount={group.boxScores.length || group.players.length}
                defaultOpen={defaultOpen}
              >
                <FootballDefensiveStatsTable
                  gameId={game.id}
                  teamName={group.teamName}
                  boxScores={group.boxScores}
                  gameStatus={game.gameStatus}
                  availablePlayers={group.players}
                  viewerGameRole={game.viewerGameRole}
                />
              </CollapsibleBoxScore>
            ))}
          </div>
        )}
        {footballSpecialTeamsStats && footballSpecialTeamsStats.length > 0 && (
          <div className="space-y-4 [content-visibility:auto] [contain-intrinsic-size:0_200px]">
            <TypographyH4>{t("game.boxScore.football.sections.specialTeams")}</TypographyH4>
            {groupByTeam(game, footballSpecialTeamsStats).map((group) => (
              <CollapsibleBoxScore
                key={group.teamName}
                teamName={group.teamName}
                playerCount={group.boxScores.length || group.players.length}
                defaultOpen={defaultOpen}
              >
                <FootballSpecialTeamsStatsTable
                  gameId={game.id}
                  teamName={group.teamName}
                  boxScores={group.boxScores}
                  gameStatus={game.gameStatus}
                  availablePlayers={group.players}
                  viewerGameRole={game.viewerGameRole}
                />
              </CollapsibleBoxScore>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderTable(group: TeamBoxScoreGroup<BoxScoreNode>) {
    const sharedProps = {
      gameId: game.id,
      teamName: group.teamName,
      gameStatus: game.gameStatus,
      availablePlayers: group.players,
      viewerGameRole: game.viewerGameRole,
    };

    if (game.sportType === SportType.PICKLEBALL) {
      return (
        <PickleballStatsTable
          {...sharedProps}
          boxScores={group.boxScores as { node: PickleballStatisticsNode }[]}
        />
      );
    }

    return (
      <BasketballBoxScoreTable
        {...sharedProps}
        boxScores={group.boxScores as { node: BasketballBoxScoreNode }[]}
      />
    );
  }

  const teamGroups =
    game.sportType === SportType.PICKLEBALL && pickleballStats
      ? groupByTeam(game, pickleballStats)
      : groupByTeam(game, boxScores ?? []);

  return (
    <div className="space-y-4 [content-visibility:auto] [contain-intrinsic-size:0_200px]">
      {teamGroups.map((group) => (
        <CollapsibleBoxScore
          key={group.teamName}
          teamName={group.teamName}
          playerCount={group.boxScores.length || group.players.length}
          defaultOpen={defaultOpen}
        >
          {renderTable(group)}
        </CollapsibleBoxScore>
      ))}
    </div>
  );
}
