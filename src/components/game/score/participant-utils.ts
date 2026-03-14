import type { GameParticipant } from "@/lib/types/game";

export function getParticipantName(participant: GameParticipant): string {
  if (participant.__typename === "TeamInstance") {
    return participant.name;
  }
  return participant.player.user.displayName;
}
