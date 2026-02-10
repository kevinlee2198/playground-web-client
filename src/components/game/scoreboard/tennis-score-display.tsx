import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ParticipantMetadata, TennisSetScore } from "@/lib/types/game";
import { useTranslations } from "next-intl";

interface TennisScoreDisplayProps {
  nameA: string;
  nameB: string;
  metadataA: ParticipantMetadata | null;
  metadataB: ParticipantMetadata | null;
}

function formatSetScore(
  playerSet: TennisSetScore,
  opponentSet?: TennisSetScore,
): string {
  const playerGames = playerSet.gamesWon;
  const opponentGames = opponentSet?.gamesWon ?? 0;

  // Show tiebreak points if this player won a tiebreak (7-6 scenario)
  if (
    playerGames === 7 &&
    opponentGames === 6 &&
    opponentSet?.tiebreakPoints !== null &&
    opponentSet?.tiebreakPoints !== undefined
  ) {
    return `${playerGames}`;
  }
  if (
    opponentGames === 7 &&
    playerGames === 6 &&
    playerSet.tiebreakPoints !== null &&
    playerSet.tiebreakPoints !== undefined
  ) {
    return `${playerGames}(${playerSet.tiebreakPoints})`;
  }

  return String(playerGames);
}

export function TennisScoreDisplay({
  nameA,
  nameB,
  metadataA,
  metadataB,
}: TennisScoreDisplayProps) {
  const t = useTranslations();

  if (
    metadataA?.__typename !== "TennisParticipantMetadata" ||
    metadataB?.__typename !== "TennisParticipantMetadata"
  ) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        {t("game.scoreboard.noScores")}
      </p>
    );
  }

  const maxSets = Math.max(metadataA.sets.length, metadataB.sets.length);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Player</TableHead>
            <TableHead className="text-center">
              {t("game.scoreboard.setsWon")}
            </TableHead>
            {Array.from({ length: maxSets }, (_, i) => (
              <TableHead key={i} className="text-center">
                {t("game.scoreboard.set")} {i + 1}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">{nameA}</TableCell>
            <TableCell className="text-center">{metadataA.setsWon}</TableCell>
            {metadataA.sets.map((set, i) => (
              <TableCell key={i} className="text-center">
                {formatSetScore(set, metadataB.sets[i])}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">{nameB}</TableCell>
            <TableCell className="text-center">{metadataB.setsWon}</TableCell>
            {metadataB.sets.map((set, i) => (
              <TableCell key={i} className="text-center">
                {formatSetScore(set, metadataA.sets[i])}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
