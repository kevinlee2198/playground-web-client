import { AnimatedScore } from "@/components/game/score/animated-score";
import { getParticipantName } from "@/components/game/score/participant-utils";
import { cn } from "@/lib/utils";
import type {
  GameParticipant,
  PickleballParticipantMetadata,
} from "@/lib/types/game";
import type { ReactNode } from "react";

function getPickleballMeta(
  participant: GameParticipant,
): PickleballParticipantMetadata | null {
  const meta = participant.metadata;
  return meta?.__typename === "PickleballParticipantMetadata" ? meta : null;
}

interface PickleballScoreProps {
  participantA: GameParticipant;
  participantB: GameParticipant;
  statusPill?: ReactNode;
  size?: "sm" | "lg";
}

export function PickleballScore({
  participantA,
  participantB,
  statusPill,
  size = "sm",
}: PickleballScoreProps) {
  const metaA = getPickleballMeta(participantA);
  const metaB = getPickleballMeta(participantB);
  const nameA = getParticipantName(participantA);
  const nameB = getParticipantName(participantB);

  const gamesA = metaA?.gamesWon ?? 0;
  const gamesB = metaB?.gamesWon ?? 0;

  const aWins = gamesA > gamesB;
  const bWins = gamesB > gamesA;

  const gameScores =
    metaA && metaB && metaA.games.length > 0
      ? metaA.games.map((gameA, i) => {
          const gameB = metaB.games[i];
          return `${gameA.pointsScored}-${gameB ? gameB.pointsScored : 0}`;
        })
      : null;

  const nameClass = size === "lg" ? "text-base sm:text-lg" : "text-sm";
  const scoreClass = size === "lg" ? "text-5xl sm:text-6xl" : "text-3xl";
  const pillClass =
    size === "lg" ? "text-sm px-3 py-1" : "text-xs px-2 py-0.5";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 text-center min-w-0">
          <p
            className={cn(
              "truncate font-semibold font-heading",
              nameClass,
            )}
          >
            {nameA}
          </p>
          <AnimatedScore
            value={gamesA}
            winning={aWins}
            scoreClass={scoreClass}
          />
        </div>

        {statusPill ? <div className="shrink-0">{statusPill}</div> : null}

        <div className="flex-1 text-center min-w-0">
          <p
            className={cn(
              "truncate font-semibold font-heading",
              nameClass,
            )}
          >
            {nameB}
          </p>
          <AnimatedScore
            value={gamesB}
            winning={bWins}
            scoreClass={scoreClass}
          />
        </div>
      </div>

      {gameScores ? (
        <div className="flex items-center justify-center gap-2">
          {gameScores.map((score, i) => (
            <span
              key={`game-${i}`}
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
