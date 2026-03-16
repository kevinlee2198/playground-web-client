"use client";

import { BasketballBoxScoreTable } from "@/components/game/basketball-box-score-table";
import { CollapsibleBoxScore } from "@/components/game/collapsible-box-score";
import { GameStatus, SportType } from "@/lib/constants";
import type {
  GameDetail,
  PlayerRef,
  TeamInstanceDetail,
} from "@/lib/types/game";
import type { BasketballBoxScoreNode } from "@/lib/types/stats/basketball";

interface GameBoxScoresProps {
  game: GameDetail;
  boxScores: { node: BasketballBoxScoreNode }[];
}

interface TeamBoxScoreGroup {
  teamName: string;
  players: PlayerRef[];
  boxScores: { node: BasketballBoxScoreNode }[];
}

function groupByTeam(
  game: GameDetail,
  allBoxScores: { node: BasketballBoxScoreNode }[],
): TeamBoxScoreGroup[] {
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
}: GameBoxScoresProps) {
  if (game.sportType !== SportType.BASKETBALL) {
    return null;
  }

  if (game.gameStatus === GameStatus.SCHEDULED) {
    return null;
  }

  const teamGroups = groupByTeam(game, boxScores);

  // Expand by default when the viewer is an owner/editor and the game is complete
  const defaultOpen =
    game.viewerGameRole != null && game.gameStatus === GameStatus.COMPLETE;

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
