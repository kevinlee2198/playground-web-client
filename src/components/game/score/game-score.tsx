"use client";

import { SimpleScore } from "@/components/game/score/simple-score";
import { TennisScore } from "@/components/game/score/tennis-score";
import type { SportType } from "@/lib/constants";
import type { GameParticipant } from "@/lib/types/game";

interface GameScoreProps {
  sportType: SportType;
  participants: GameParticipant[];
  variant?: "compact" | "default";
}

export function GameScore({ sportType, participants }: GameScoreProps) {
  if (participants.length < 2) return null;

  const [a, b] = participants;
  if (!a.metadata && !b.metadata) return null;

  if (sportType === "BASKETBALL" || sportType === "FOOTBALL") {
    return <SimpleScore participantA={a} participantB={b} />;
  }

  if (sportType === "TENNIS") {
    return <TennisScore participantA={a} participantB={b} />;
  }

  return null;
}
