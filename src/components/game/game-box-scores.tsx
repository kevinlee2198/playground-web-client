import { BasketballBoxScoreTable } from "@/components/game/basketball-box-score-table";
import { GameStatus, SportType } from "@/lib/constants";
import { playerRefFragment } from "@/lib/graphql-fragments";
import { authQuery } from "@/lib/graphql-request";
import type {
  GameDetail,
  PlayerRef,
  TeamInstanceDetail,
} from "@/lib/types/game";
import type { BasketballBoxScoreNode } from "@/lib/types/stats/basketball";

interface GameBoxScoresProps {
  game: GameDetail;
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

export async function GameBoxScores({ game }: GameBoxScoresProps) {
  if (game.sportType !== SportType.BASKETBALL) {
    return null;
  }

  if (game.gameStatus === GameStatus.SCHEDULED) {
    return null;
  }

  const boxScoreResponse = await authQuery({
    basketballBoxScores: {
      __args: {
        input: { gameIds: [game.id] },
        first: 50,
      },
      edges: {
        node: {
          id: true,
          player: playerRefFragment,
          points: true,
          assists: true,
          totalRebounds: true,
          offensiveRebounds: true,
          defensiveRebounds: true,
          steals: true,
          blocks: true,
          turnovers: true,
          personalFouls: true,
          fieldGoalsMade: true,
          fieldGoalsAttempted: true,
          fieldGoalPercentage: true,
          threePointersMade: true,
          threePointersAttempted: true,
          threePointerPercentage: true,
          twoPointersMade: true,
          twoPointersAttempted: true,
          twoPointerPercentage: true,
          freeThrowsMade: true,
          freeThrowsAttempted: true,
          freeThrowPercentage: true,
        },
      },
    },
  });

  const allBoxScores = boxScoreResponse.data?.basketballBoxScores?.edges ?? [];
  const teamGroups = groupByTeam(game, allBoxScores);

  return (
    <div className="space-y-6">
      {teamGroups.map((group) => (
        <BasketballBoxScoreTable
          key={group.teamName}
          gameId={game.id}
          teamName={group.teamName}
          boxScores={group.boxScores}
          gameStatus={game.gameStatus}
          availablePlayers={group.players}
          viewerGameRole={game.viewerGameRole}
        />
      ))}
    </div>
  );
}
