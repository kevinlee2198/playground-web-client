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
 * Configuration for each sport subtype including participation type and limits.
 * maxTeamSize is only defined for team sports and includes bench players.
 * maxParticipants is the max number of teams (team sports) or individual players (individual sports).
 */
export const SportSubtypeConfig = {
  FIVE_ON_FIVE: {
    participation: ParticipationType.TEAM,
    maxTeamSize: 15,
    maxParticipants: 2,
  },
  THREE_ON_THREE: {
    participation: ParticipationType.TEAM,
    maxTeamSize: 6,
    maxParticipants: 2,
  },
  FLAG_FOOTBALL: {
    participation: ParticipationType.TEAM,
    maxTeamSize: 15,
    maxParticipants: 2,
  },
  AMERICAN_FOOTBALL: {
    participation: ParticipationType.TEAM,
    maxTeamSize: 53,
    maxParticipants: 2,
  },
  SINGLES: { participation: ParticipationType.INDIVIDUAL, maxParticipants: 2 },
  DOUBLES: {
    participation: ParticipationType.TEAM,
    maxTeamSize: 2,
    maxParticipants: 2,
  },
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

/**
 * Get the maximum number of participants (teams or individuals) for a given sport subtype.
 */
export function getMaxParticipants(sportSubtype: SportSubtype): number {
  return SportSubtypeConfig[sportSubtype].maxParticipants;
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

/**
 * Extract the SportSubtype value from a GameMetadata union member.
 * Due to GraphQL field conflict resolution, each metadata type uses
 * an aliased subtype field (basketballSubtype, tennisSubtype, footballSubtype).
 */
export function getSubtypeFromMetadata(
  metadata:
    | { __typename: "BasketballGameMetadata"; basketballSubtype: string }
    | { __typename: "TennisGameMetadata"; tennisSubtype: string }
    | { __typename: "FootballGameMetadata"; footballSubtype: string },
): SportSubtype {
  switch (metadata.__typename) {
    case "BasketballGameMetadata":
      return metadata.basketballSubtype as SportSubtype;
    case "TennisGameMetadata":
      return metadata.tennisSubtype as SportSubtype;
    case "FootballGameMetadata":
      return metadata.footballSubtype as SportSubtype;
  }
}
