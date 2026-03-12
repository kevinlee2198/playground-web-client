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
}

export function SimpleScore({ participantA, participantB, statusPill }: SimpleScoreProps) {
  const scoreA = getSimpleScore(participantA.metadata);
  const scoreB = getSimpleScore(participantB.metadata);
  const nameA = getParticipantName(participantA);
  const nameB = getParticipantName(participantB);

  const aWins = scoreA !== null && scoreB !== null && scoreA > scoreB;
  const bWins = scoreA !== null && scoreB !== null && scoreB > scoreA;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex-1 text-center min-w-0">
        <p className="truncate text-sm font-semibold font-heading">{nameA}</p>
        <p
          className={cn(
            "text-3xl font-bold font-heading tabular-nums",
            aWins ? "text-primary" : undefined,
          )}
        >
          {scoreA !== null ? scoreA : "-"}
        </p>
      </div>

      {statusPill ? <div className="shrink-0">{statusPill}</div> : null}

      <div className="flex-1 text-center min-w-0">
        <p className="truncate text-sm font-semibold font-heading">{nameB}</p>
        <p
          className={cn(
            "text-3xl font-bold font-heading tabular-nums",
            bWins ? "text-primary" : undefined,
          )}
        >
          {scoreB !== null ? scoreB : "-"}
        </p>
      </div>
    </div>
  );
}
