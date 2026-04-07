"use client";

import { BasketballBoxScoreTable } from "@/components/game/basketball-box-score-table";
import { CollapsibleBoxScore } from "@/components/game/collapsible-box-score";
import { FootballDefensiveStatsTable } from "@/components/game/football-defensive-stats-table";
import { FootballOffensiveStatsTable } from "@/components/game/football-offensive-stats-table";
import { FootballSpecialTeamsStatsTable } from "@/components/game/football-special-teams-stats-table";
import { BaseballBattingStatsTable } from "@/components/game/baseball-batting-stats-table";
import { BaseballPitchingStatsTable } from "@/components/game/baseball-pitching-stats-table";
import { BaseballFieldingStatsTable } from "@/components/game/baseball-fielding-stats-table";
import { PickleballStatsTable } from "@/components/game/pickleball-stats-table";
import { TennisStatsTable } from "@/components/game/tennis-stats-table";
import { VolleyballStatsTable } from "@/components/game/volleyball-stats-table";
import { TypographyH4 } from "@/components/ui/typography";
import { GameStatus, SportType } from "@/lib/constants";
import type {
  GameDetail,
  IndividualParticipantNode,
  PlayerRef,
  TeamInstanceDetail,
} from "@/lib/types/game";
import type { BasketballStatsNode } from "@/lib/types/stats/basketball";
import type { StatsNode } from "@/lib/types/stats/base";
import type { PickleballStatsNode } from "@/lib/types/stats/pickleball";
import type { TennisStatsNode } from "@/lib/types/stats/tennis";
import type {
  FootballDefensiveStatsNode,
  FootballOffensiveStatsNode,
  FootballSpecialTeamsStatsNode,
} from "@/lib/types/stats/football";
import type {
  BaseballBattingStatsNode,
  BaseballPitchingStatsNode,
  BaseballFieldingStatsNode,
} from "@/lib/types/stats/baseball";
import type { VolleyballStatsNode } from "@/lib/types/stats/volleyball";
import { useTranslations } from "next-intl";

interface GameBoxScoresProps {
  game: GameDetail;
  boxScores?: { node: BasketballStatsNode }[];
  pickleballStats?: { node: PickleballStatsNode }[];
  tennisStats?: { node: TennisStatsNode }[];
  footballOffensiveStats?: { node: FootballOffensiveStatsNode }[];
  footballDefensiveStats?: { node: FootballDefensiveStatsNode }[];
  footballSpecialTeamsStats?: { node: FootballSpecialTeamsStatsNode }[];
  baseballBattingStats?: { node: BaseballBattingStatsNode }[];
  baseballPitchingStats?: { node: BaseballPitchingStatsNode }[];
  baseballFieldingStats?: { node: BaseballFieldingStatsNode }[];
  volleyballStats?: { node: VolleyballStatsNode }[];
}

interface TeamBoxScoreGroup<T extends StatsNode> {
  teamName: string;
  players: PlayerRef[];
  boxScores: { node: T }[];
}

function groupByTeam<T extends StatsNode>(
  game: GameDetail,
  allBoxScores: { node: T }[],
  fallbackGroupName: string,
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

  // Handle individual participants (e.g., tennis/pickleball singles)
  if (teams.length === 0) {
    const individualPlayers: PlayerRef[] = [];
    for (const edge of game.participants.edges) {
      if (edge.node.__typename === "IndividualParticipant") {
        individualPlayers.push((edge.node as IndividualParticipantNode).player);
      }
    }
    if (individualPlayers.length > 0) {
      return [{
        teamName: fallbackGroupName,
        players: individualPlayers,
        boxScores: allBoxScores,
      }];
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
  tennisStats,
  footballOffensiveStats,
  footballDefensiveStats,
  footballSpecialTeamsStats,
  baseballBattingStats,
  baseballPitchingStats,
  baseballFieldingStats,
  volleyballStats,
}: GameBoxScoresProps) {
  const t = useTranslations();

  if (
    game.sportType !== SportType.BASKETBALL &&
    game.sportType !== SportType.PICKLEBALL &&
    game.sportType !== SportType.TENNIS &&
    game.sportType !== SportType.FOOTBALL &&
    game.sportType !== SportType.BASEBALL &&
    game.sportType !== SportType.VOLLEYBALL
  ) {
    return null;
  }

  if (game.gameStatus === GameStatus.SCHEDULED) {
    return null;
  }

  // Expand by default when the viewer is an owner/editor and the game is complete
  const defaultOpen =
    game.viewerGameRole != null && game.gameStatus === GameStatus.COMPLETE;

  const fallbackGroupName = t("game.boxScore.title");

  if (game.sportType === SportType.BASEBALL) {
    return (
      <div className="space-y-6">
        {baseballBattingStats && baseballBattingStats.length > 0 && (
          <div className="space-y-4 [content-visibility:auto] [contain-intrinsic-size:0_200px]">
            <TypographyH4>{t("game.boxScore.baseball.sections.batting")}</TypographyH4>
            {groupByTeam(game, baseballBattingStats, fallbackGroupName).map((group) => (
              <CollapsibleBoxScore
                key={group.teamName}
                teamName={group.teamName}
                playerCount={group.boxScores.length || group.players.length}
                defaultOpen={defaultOpen}
              >
                <BaseballBattingStatsTable
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
        {baseballPitchingStats && baseballPitchingStats.length > 0 && (
          <div className="space-y-4 [content-visibility:auto] [contain-intrinsic-size:0_200px]">
            <TypographyH4>{t("game.boxScore.baseball.sections.pitching")}</TypographyH4>
            {groupByTeam(game, baseballPitchingStats, fallbackGroupName).map((group) => (
              <CollapsibleBoxScore
                key={group.teamName}
                teamName={group.teamName}
                playerCount={group.boxScores.length || group.players.length}
                defaultOpen={defaultOpen}
              >
                <BaseballPitchingStatsTable
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
        {baseballFieldingStats && baseballFieldingStats.length > 0 && (
          <div className="space-y-4 [content-visibility:auto] [contain-intrinsic-size:0_200px]">
            <TypographyH4>{t("game.boxScore.baseball.sections.fielding")}</TypographyH4>
            {groupByTeam(game, baseballFieldingStats, fallbackGroupName).map((group) => (
              <CollapsibleBoxScore
                key={group.teamName}
                teamName={group.teamName}
                playerCount={group.boxScores.length || group.players.length}
                defaultOpen={defaultOpen}
              >
                <BaseballFieldingStatsTable
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

  if (game.sportType === SportType.FOOTBALL) {
    return (
      <div className="space-y-6">
        {footballOffensiveStats && footballOffensiveStats.length > 0 && (
          <div className="space-y-4 [content-visibility:auto] [contain-intrinsic-size:0_200px]">
            <TypographyH4>{t("game.boxScore.football.sections.offensive")}</TypographyH4>
            {groupByTeam(game, footballOffensiveStats, fallbackGroupName).map((group) => (
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
            {groupByTeam(game, footballDefensiveStats, fallbackGroupName).map((group) => (
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
            {groupByTeam(game, footballSpecialTeamsStats, fallbackGroupName).map((group) => (
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

  function renderTable(group: TeamBoxScoreGroup<StatsNode>) {
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
          boxScores={group.boxScores as { node: PickleballStatsNode }[]}
        />
      );
    }

    if (game.sportType === SportType.TENNIS) {
      return (
        <TennisStatsTable
          {...sharedProps}
          boxScores={group.boxScores as { node: TennisStatsNode }[]}
        />
      );
    }

    if (game.sportType === SportType.VOLLEYBALL) {
      return (
        <VolleyballStatsTable
          {...sharedProps}
          boxScores={group.boxScores as { node: VolleyballStatsNode }[]}
        />
      );
    }

    return (
      <BasketballBoxScoreTable
        {...sharedProps}
        boxScores={group.boxScores as { node: BasketballStatsNode }[]}
      />
    );
  }

  function getStatsForSport(): { node: StatsNode }[] {
    if (game.sportType === SportType.PICKLEBALL && pickleballStats) return pickleballStats;
    if (game.sportType === SportType.TENNIS && tennisStats) return tennisStats;
    if (game.sportType === SportType.VOLLEYBALL && volleyballStats) return volleyballStats;
    return boxScores ?? [];
  }

  const teamGroups = groupByTeam(game, getStatsForSport(), fallbackGroupName);

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
