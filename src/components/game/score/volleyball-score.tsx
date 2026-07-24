import { AnimatedScore } from "@/components/game/score/animated-score";
import { ParticipantName } from "@/components/game/score/participant-name";
import { getParticipantName } from "@/components/game/score/participant-utils";
import { cn } from "@/lib/utils";
import type {
  GameParticipant,
  VolleyballParticipantMetadata,
} from "@/lib/types/game";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

function getVolleyballMeta(
  participant: GameParticipant,
): VolleyballParticipantMetadata | null {
  const meta = participant.metadata;
  return meta?.__typename === "VolleyballParticipantMetadata" ? meta : null;
}

interface VolleyballScoreProps {
  participantA: GameParticipant;
  participantB: GameParticipant;
  statusPill?: ReactNode;
  size?: "sm" | "lg";
  showWinner?: boolean;
}

export function VolleyballScore({
  participantA,
  participantB,
  statusPill,
  size = "sm",
  showWinner = false,
}: VolleyballScoreProps) {
  const t = useTranslations();
  const unnamedTeam = t("leagues.team.unnamed");
  const metaA = getVolleyballMeta(participantA);
  const metaB = getVolleyballMeta(participantB);
  const nameA = getParticipantName(participantA, unnamedTeam);
  const nameB = getParticipantName(participantB, unnamedTeam);

  const setsA = metaA?.setsWon ?? 0;
  const setsB = metaB?.setsWon ?? 0;

  const aWins = setsA > setsB;
  const bWins = setsB > setsA;

  const setScores =
    metaA && metaB && metaA.sets.length > 0
      ? metaA.sets.map((setA, i) => {
          const setB = metaB.sets[i];
          return `${setA.pointsScored}-${setB ? setB.pointsScored : 0}`;
        })
      : null;

  const scoreClass = size === "lg" ? "text-5xl sm:text-6xl" : "text-3xl";
  const pillClass =
    size === "lg" ? "text-sm px-3 py-1" : "text-xs px-2 py-0.5";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 text-center min-w-0">
          <ParticipantName
            name={nameA}
            size={size}
            isWinner={showWinner && aWins}
            isLoser={showWinner && bWins}
          />
          <AnimatedScore
            value={setsA}
            winning={aWins}
            scoreClass={scoreClass}
          />
        </div>

        {statusPill ? <div className="shrink-0">{statusPill}</div> : null}

        <div className="flex-1 text-center min-w-0">
          <ParticipantName
            name={nameB}
            size={size}
            isWinner={showWinner && bWins}
            isLoser={showWinner && aWins}
          />
          <AnimatedScore
            value={setsB}
            winning={bWins}
            scoreClass={scoreClass}
          />
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
