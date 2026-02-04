"use client";

import type {
  GameParticipant,
  IndividualParticipantNode,
  ParticipantMetadata,
  TeamInstanceNode,
} from "@/lib/types/game";

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
}

function getParticipantName(participant: GameParticipant): string {
  if (participant.__typename === "TeamInstance") {
    return (participant as TeamInstanceNode).name;
  }
  const p = participant as IndividualParticipantNode;
  return p.player ? `${p.player.firstName} ${p.player.lastName}` : "Unknown";
}

export function SimpleScore({ participantA, participantB }: SimpleScoreProps) {
  const scoreA = getSimpleScore(participantA.metadata);
  const scoreB = getSimpleScore(participantB.metadata);
  const displayA = scoreA !== null ? String(scoreA) : "-";
  const displayB = scoreB !== null ? String(scoreB) : "-";
  const nameA = getParticipantName(participantA);
  const nameB = getParticipantName(participantB);

  return (
    <span>
      {nameA} {displayA} - {displayB} {nameB}
    </span>
  );
}
