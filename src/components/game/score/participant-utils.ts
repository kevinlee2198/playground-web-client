import type { GameParticipant } from "@/lib/types/game";

// TODO: Use displayName from the User object once PlayerRef includes a user reference
// (requires adding user { displayName } to the GraphQL participant fragment)
export function getParticipantName(participant: GameParticipant): string {
  if (participant.__typename === "TeamInstance") {
    return participant.name;
  }
  return `${participant.player.firstName} ${participant.player.lastName}`;
}
