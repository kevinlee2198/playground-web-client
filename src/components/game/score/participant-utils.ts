import type { GameParticipant } from "@/lib/types/game";

// Returns the display name of the participant. For a team with no explicit
// name, builds a label from the first few roster + guest display names
// ("Alice & Bob", "Alice, Bob +2") so the UI shows something recognizable
// instead of a generic placeholder. `fallback` is only used for the rare
// no-name + empty-roster case.
//
// Both User and GuestParticipant expose displayName at the same depth, so
// the individual-participant union branch collapses to one access.
export function getParticipantName(
  participant: GameParticipant,
  fallback: string,
): string {
  if (participant.__typename === "TeamInstance") {
    if (participant.name) return participant.name;

    const memberNames = [
      ...participant.roster.map((u) => u.displayName),
      ...participant.guests.map((g) => g.displayName),
    ];

    if (memberNames.length === 0) return fallback;
    if (memberNames.length === 1) return memberNames[0];
    if (memberNames.length === 2) return `${memberNames[0]} & ${memberNames[1]}`;
    return `${memberNames[0]}, ${memberNames[1]} +${memberNames.length - 2}`;
  }
  return participant.participant.displayName;
}
