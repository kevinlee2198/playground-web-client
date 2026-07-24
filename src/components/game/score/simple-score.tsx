import { AnimatedScore } from "@/components/game/score/animated-score";
import { ParticipantName } from "@/components/game/score/participant-name";
import { getParticipantName } from "@/components/game/score/participant-utils";
import type { GameParticipant, ParticipantMetadata } from "@/lib/types/game";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

function getSimpleScore(
  metadata: ParticipantMetadata | null | undefined,
): number | null {
  if (!metadata) return null;
  if (
    metadata.__typename === "BaseballParticipantMetadata" ||
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
  showWinner?: boolean;
}

export function SimpleScore({ participantA, participantB, statusPill, size = "sm", showWinner = false }: SimpleScoreProps) {
  const t = useTranslations();
  const unnamedTeam = t("leagues.team.unnamed");
  const scoreA = getSimpleScore(participantA.metadata);
  const scoreB = getSimpleScore(participantB.metadata);
  const nameA = getParticipantName(participantA, unnamedTeam);
  const nameB = getParticipantName(participantB, unnamedTeam);

  const aWins = scoreA !== null && scoreB !== null && scoreA > scoreB;
  const bWins = scoreA !== null && scoreB !== null && scoreB > scoreA;

  const scoreClass = size === "lg" ? "text-5xl sm:text-6xl" : "text-3xl";

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex-1 text-center min-w-0">
        <ParticipantName
          name={nameA}
          size={size}
          isWinner={showWinner && aWins}
          isLoser={showWinner && bWins}
        />
        <AnimatedScore value={scoreA} winning={aWins} scoreClass={scoreClass} />
      </div>

      {statusPill ? <div className="shrink-0">{statusPill}</div> : null}

      <div className="flex-1 text-center min-w-0">
        <ParticipantName
          name={nameB}
          size={size}
          isWinner={showWinner && bWins}
          isLoser={showWinner && aWins}
        />
        <AnimatedScore value={scoreB} winning={bWins} scoreClass={scoreClass} />
      </div>
    </div>
  );
}
