export enum FormMode {
  VIEW = "VIEW",
  CREATE = "CREATE",
  EDIT = "EDIT",
}

export enum UnitPreference {
  METRIC = "METRIC",
  IMPERIAL = "IMPERIAL",
}

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

/**
 * Configuration for each sport subtype including participation type and team size limits.
 * maxTeamSize is only defined for team sports and includes bench players.
 */
export const SportSubtypeConfig = {
  FIVE_ON_FIVE: { participation: ParticipationType.TEAM, maxTeamSize: 15 }, // 5 starters + 10 bench
  THREE_ON_THREE: { participation: ParticipationType.TEAM, maxTeamSize: 6 }, // 3 starters + 3 bench
  FLAG_FOOTBALL: { participation: ParticipationType.TEAM, maxTeamSize: 15 }, // Typical flag football roster
  AMERICAN_FOOTBALL: { participation: ParticipationType.TEAM, maxTeamSize: 53 }, // NFL-style roster
  SINGLES: { participation: ParticipationType.INDIVIDUAL },
  DOUBLES: { participation: ParticipationType.TEAM, maxTeamSize: 2 }, // Tennis doubles pair
} as const;

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
  return SportSubtypeConfig[sportSubtype].participation;
}

/**
 * Get the maximum team size for a given sport subtype.
 * Returns undefined for individual sports.
 */
export function getMaxTeamSize(sportSubtype: SportSubtype): number | undefined {
  const config = SportSubtypeConfig[sportSubtype];
  return "maxTeamSize" in config ? config.maxTeamSize : undefined;
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

