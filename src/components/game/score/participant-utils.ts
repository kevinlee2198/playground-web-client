import type { GameParticipant } from "@/lib/types/game";

// Returns the display name of the participant. Team instances fall back to
// the provided string when `name` is null (e.g., t("leagues.team.unnamed")).
// Both User and GuestParticipant expose displayName at the same depth, so
// the individual-participant union branch collapses to one access.
export function getParticipantName(
  participant: GameParticipant,
  unnamedTeamFallback: string,
): string {
  if (participant.__typename === "TeamInstance") {
    return participant.name ?? unnamedTeamFallback;
  }
  return participant.participant.displayName;
}
