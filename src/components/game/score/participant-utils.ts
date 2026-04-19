import type {
  GameParticipant,
  TeamInstanceDetail,
  TeamInstanceNode,
} from "@/lib/types/game";

// Derives a display label for a team. When the team has an explicit
// non-empty name, use it. Otherwise build a label from the first two
// roster + guest display names ("Alice", "Alice & Bob", "Alice, Bob +2")
// so the UI shows something recognizable instead of a generic placeholder.
// `fallback` is only used for the rare no-name + empty-roster case.
//
// A null or empty-string `name` both trigger roster derivation — blank
// names are treated as unset. Empty-string member display names are
// filtered out so they don't produce leading separators like " & Bob".
export function deriveTeamName(
  team: TeamInstanceNode | TeamInstanceDetail,
  fallback: string,
): string {
  if (team.name) return team.name;

  const memberNames = [
    ...team.roster.map((u) => u.displayName),
    ...team.guests.map((g) => g.displayName),
  ].filter((n) => n.trim().length > 0);

  if (memberNames.length === 0) return fallback;
  if (memberNames.length === 1) return memberNames[0];
  if (memberNames.length === 2) return `${memberNames[0]} & ${memberNames[1]}`;
  return `${memberNames[0]}, ${memberNames[1]} +${memberNames.length - 2}`;
}

// Returns the display name of the participant. TeamInstance branches go
// through `deriveTeamName`; individual branches collapse to one access
// since both User and GuestParticipant expose displayName at the same depth.
export function getParticipantName(
  participant: GameParticipant,
  fallback: string,
): string {
  if (participant.__typename === "TeamInstance") {
    return deriveTeamName(participant, fallback);
  }
  return participant.participant.displayName;
}
