import type { GameParticipant } from "@/lib/types/game";

// Returns the display name of the participant, or null for an unnamed team
// so callers can apply their own i18n fallback (e.g. t("leagues.team.unnamed")).
// Both User and GuestParticipant expose displayName at the same depth,
// so the union branch collapses to one access.
export function getParticipantName(
  participant: GameParticipant,
): string | null {
  if (participant.__typename === "TeamInstance") {
    return participant.name;
  }
  return participant.participant.displayName;
}
