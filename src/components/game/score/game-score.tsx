import { SimpleScore } from "@/components/game/score/simple-score";
import { TennisScore } from "@/components/game/score/tennis-score";
import { SportType } from "@/lib/constants";
import type { GameParticipant } from "@/lib/types/game";
import type { ReactNode } from "react";

interface GameScoreProps {
  sportType: SportType;
  participants: GameParticipant[];
  statusPill?: ReactNode;
}

export function GameScore({ sportType, participants, statusPill }: GameScoreProps) {
  if (participants.length < 2) return null;

  const [a, b] = participants;
  if (!a.metadata && !b.metadata) return null;

  switch (sportType) {
    case SportType.BASKETBALL:
    case SportType.FOOTBALL:
      return <SimpleScore participantA={a} participantB={b} statusPill={statusPill} />;
    case SportType.TENNIS:
      return <TennisScore participantA={a} participantB={b} statusPill={statusPill} />;
    default:
      return null;
  }
}
