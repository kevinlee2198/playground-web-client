import { AnimatedScore } from "@/components/game/score/animated-score";
import { getParticipantName } from "@/components/game/score/participant-utils";
import { cn } from "@/lib/utils";
import type { GameParticipant, ParticipantMetadata } from "@/lib/types/game";
import type { ReactNode } from "react";

function getSimpleScore(
  metadata: ParticipantMetadata | null | undefined,
): number | null {
  if (!metadata) return null;
  if (
    metadata.__typename === "BasketballParticipantMetadata" ||
    metadata.__typename === "FootballParticipantMetadata"
  ) {
    return metadata.score;
  }
  return null;
}

interface SimpleScoreProps {
  participantA: GameParticipant;
  participantB: GameParticipant;
  statusPill?: ReactNode;
  size?: "sm" | "lg";
}

export function SimpleScore({ participantA, participantB, statusPill, size = "sm" }: SimpleScoreProps) {
  const scoreA = getSimpleScore(participantA.metadata);
  const scoreB = getSimpleScore(participantB.metadata);
  const nameA = getParticipantName(participantA);
  const nameB = getParticipantName(participantB);

  const aWins = scoreA !== null && scoreB !== null && scoreA > scoreB;
  const bWins = scoreA !== null && scoreB !== null && scoreB > scoreA;

  const nameClass = size === "lg" ? "text-base sm:text-lg" : "text-sm";
  const scoreClass = size === "lg" ? "text-5xl sm:text-6xl" : "text-3xl";

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex-1 text-center min-w-0">
        <p className={cn("truncate font-semibold font-heading", nameClass)}>{nameA}</p>
        <AnimatedScore value={scoreA} winning={aWins} scoreClass={scoreClass} />
      </div>

      {statusPill ? <div className="shrink-0">{statusPill}</div> : null}

      <div className="flex-1 text-center min-w-0">
        <p className={cn("truncate font-semibold font-heading", nameClass)}>{nameB}</p>
        <AnimatedScore value={scoreB} winning={bWins} scoreClass={scoreClass} />
      </div>
    </div>
  );
}
