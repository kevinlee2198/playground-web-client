import { AnimatedScore } from "@/components/game/score/animated-score";
import { getParticipantName } from "@/components/game/score/participant-utils";
import { cn } from "@/lib/utils";
import type {
  GameParticipant,
  TennisParticipantMetadata,
  TennisSetScore,
} from "@/lib/types/game";
import type { ReactNode } from "react";

function formatSetScore(
  playerASet: TennisSetScore,
  playerBSet: TennisSetScore,
): string {
  const a = playerASet.gamesWon;
  const b = playerBSet.gamesWon;

  if (a === 7 && b === 6 && playerBSet.tiebreakPoints !== null) {
    return `${a}-${b}(${playerBSet.tiebreakPoints})`;
  }
  if (b === 7 && a === 6 && playerASet.tiebreakPoints !== null) {
    return `${a}(${playerASet.tiebreakPoints})-${b}`;
  }

  return `${a}-${b}`;
}

function getTennisMeta(
  participant: GameParticipant,
): TennisParticipantMetadata | null {
  const meta = participant.metadata;
  return meta?.__typename === "TennisParticipantMetadata" ? meta : null;
}

interface TennisScoreProps {
  participantA: GameParticipant;
  participantB: GameParticipant;
  statusPill?: ReactNode;
  size?: "sm" | "lg";
}

export function TennisScore({ participantA, participantB, statusPill, size = "sm" }: TennisScoreProps) {
  const tennisA = getTennisMeta(participantA);
  const tennisB = getTennisMeta(participantB);
  const nameA = getParticipantName(participantA);
  const nameB = getParticipantName(participantB);

  const setsA = tennisA?.setsWon ?? 0;
  const setsB = tennisB?.setsWon ?? 0;

  const aWins = setsA > setsB;
  const bWins = setsB > setsA;

  const setScores =
    tennisA && tennisB && tennisA.sets.length > 0
      ? tennisA.sets.map((setA, i) => {
          const setB = tennisB.sets[i];
          return setB ? formatSetScore(setA, setB) : `${setA.gamesWon}-0`;
        })
      : null;

  const nameClass = size === "lg" ? "text-base sm:text-lg" : "text-sm";
  const scoreClass = size === "lg" ? "text-5xl sm:text-6xl" : "text-3xl";
  const pillClass = size === "lg" ? "text-sm px-3 py-1" : "text-xs px-2 py-0.5";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 text-center min-w-0">
          <p className={cn("truncate font-semibold font-heading", nameClass)}>{nameA}</p>
          <AnimatedScore value={setsA} winning={aWins} scoreClass={scoreClass} />
        </div>

        {statusPill ? <div className="shrink-0">{statusPill}</div> : null}

        <div className="flex-1 text-center min-w-0">
          <p className={cn("truncate font-semibold font-heading", nameClass)}>{nameB}</p>
          <AnimatedScore value={setsB} winning={bWins} scoreClass={scoreClass} />
        </div>
      </div>

      {setScores ? (
        <div className="flex items-center justify-center gap-2">
          {setScores.map((score, i) => (
            <span
              key={`set-${i}`}
              className={cn(
                "rounded-full bg-muted font-medium text-muted-foreground tabular-nums",
                pillClass,
              )}
            >
              {score}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
