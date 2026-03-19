import { PickleballScore } from "@/components/game/score/pickleball-score";
import { SimpleScore } from "@/components/game/score/simple-score";
import { TennisScore } from "@/components/game/score/tennis-score";
import { SportType } from "@/lib/constants";
import type { GameParticipant } from "@/lib/types/game";
import type { ReactNode } from "react";

interface GameScoreProps {
  sportType: SportType;
  participants: GameParticipant[];
  statusPill?: ReactNode;
  size?: "sm" | "lg";
}

export function GameScore({ sportType, participants, statusPill, size = "sm" }: GameScoreProps) {
  if (participants.length < 2) return null;

  const [a, b] = participants;
  if (!a.metadata && !b.metadata) return null;

  switch (sportType) {
    case SportType.BASEBALL:
    case SportType.BASKETBALL:
    case SportType.FOOTBALL:
      return <SimpleScore participantA={a} participantB={b} statusPill={statusPill} size={size} />;
    case SportType.TENNIS:
      return <TennisScore participantA={a} participantB={b} statusPill={statusPill} size={size} />;
    case SportType.PICKLEBALL:
      return <PickleballScore participantA={a} participantB={b} statusPill={statusPill} size={size} />;
    default:
      return null;
  }
}
