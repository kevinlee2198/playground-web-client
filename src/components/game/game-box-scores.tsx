"use client";

import { BasketballBoxScoreTable } from "@/components/game/basketball-box-score-table";
import { PickleballStatsTable } from "@/components/game/pickleball-stats-table";
import { CollapsibleBoxScore } from "@/components/game/collapsible-box-score";
import { GameStatus, SportType } from "@/lib/constants";
import type {
  GameDetail,
  PlayerRef,
  TeamInstanceDetail,
} from "@/lib/types/game";
import type { BasketballBoxScoreNode } from "@/lib/types/stats/basketball";
import type { PickleballStatisticsNode } from "@/lib/types/stats/pickleball";
import type { BoxScoreNode } from "@/lib/types/stats/base";

interface GameBoxScoresProps {
  game: GameDetail;
  boxScores: { node: BasketballBoxScoreNode }[];
  pickleballStats?: { node: PickleballStatisticsNode }[];
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
}: GameBoxScoresProps) {
  if (
    game.sportType !== SportType.BASKETBALL &&
    game.sportType !== SportType.PICKLEBALL
  ) {
    return null;
  }

  if (game.gameStatus === GameStatus.SCHEDULED) {
    return null;
  }

  // Expand by default when the viewer is an owner/editor and the game is complete
  const defaultOpen =
    game.viewerGameRole != null && game.gameStatus === GameStatus.COMPLETE;

  if (game.sportType === SportType.PICKLEBALL && pickleballStats) {
    const teamGroups = groupByTeam(game, pickleballStats);
    return (
      <div className="space-y-4 [content-visibility:auto] [contain-intrinsic-size:0_200px]">
        {teamGroups.map((group) => (
          <CollapsibleBoxScore
            key={group.teamName}
            teamName={group.teamName}
            playerCount={group.boxScores.length || group.players.length}
            defaultOpen={defaultOpen}
          >
            <PickleballStatsTable
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
    );
  }

  const teamGroups = groupByTeam(game, boxScores);

  return (
    <div
      className="space-y-4 [content-visibility:auto] [contain-intrinsic-size:0_200px]"
    >
      {teamGroups.map((group) => (
        <CollapsibleBoxScore
          key={group.teamName}
          teamName={group.teamName}
          playerCount={group.boxScores.length || group.players.length}
          defaultOpen={defaultOpen}
        >
          <BasketballBoxScoreTable
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
  );
}
