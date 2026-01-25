export enum SortDirection {
  ASC = "ASC",
  DESC = "DESC",
}

export enum FriendshipStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  BLOCKED = "BLOCKED",
}

export enum GameStatus {
  SCHEDULED = "SCHEDULED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETE = "COMPLETE",
}

export enum ParticipationType {
  TEAM = "TEAM",
  INDIVIDUAL = "INDIVIDUAL",
}

export enum SportSubtype {
  FIVE_ON_FIVE = "FIVE_ON_FIVE",
  THREE_ON_THREE = "THREE_ON_THREE",
  FLAG_FOOTBALL = "FLAG_FOOTBALL",
  AMERICAN_FOOTBALL = "AMERICAN_FOOTBALL",
  SINGLES = "SINGLES",
  DOUBLES = "DOUBLES",
}

export const SportSubtypeParticipation = {
  FIVE_ON_FIVE: ParticipationType.TEAM,
  THREE_ON_THREE: ParticipationType.TEAM,
  FLAG_FOOTBALL: ParticipationType.TEAM,
  AMERICAN_FOOTBALL: ParticipationType.TEAM,
  SINGLES: ParticipationType.INDIVIDUAL,
  DOUBLES: ParticipationType.TEAM,
};

export const SportType = {
  //   BASEBALL: [],
  BASKETBALL: {
    subtypes: [SportSubtype.FIVE_ON_FIVE, SportSubtype.THREE_ON_THREE],
    icon: "/sports/basketball.svg",
  },
  FOOTBALL: {
    subtypes: [SportSubtype.FLAG_FOOTBALL, SportSubtype.AMERICAN_FOOTBALL],
    icon: "/sports/football.svg",
  },
  TENNIS: {
    subtypes: [SportSubtype.SINGLES, SportSubtype.DOUBLES],
    icon: "/sports/tennis.svg",
  },
  //   PICKLEBALL: [SportSubtype.SINGLES, SportSubtype.DOUBLES],
  //   SOFTBALL: [],
  //   SWIM: [],
} as const;

export type SportType = keyof typeof SportType;

export function getSubtypes(sport: SportType) {
  return SportType[sport].subtypes;
}

export function getSportIconPath(sport: SportType) {
  return SportType[sport].icon;
}

export function getParticipationType(sportSubtype: SportSubtype) {
  return SportSubtypeParticipation[sportSubtype];
}

export enum GameSortField {
  START_DATE = "START_DATE",
  END_DATE = "END_DATE",
  GAME_STATUS = "GAME_STATUS",
}

/**
 * Badge variant mapping for game status display
 */
export const GameStatusBadgeVariant = {
  SCHEDULED: "secondary",
  IN_PROGRESS: "default",
  COMPLETE: "outline",
} as const;
