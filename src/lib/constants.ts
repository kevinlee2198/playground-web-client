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

export enum SportFormat {
  FIVE_ON_FIVE = "FIVE_ON_FIVE",
  THREE_ON_THREE = "THREE_ON_THREE",
  FLAG_FOOTBALL = "FLAG_FOOTBALL",
  AMERICAN_FOOTBALL = "AMERICAN_FOOTBALL",
  SINGLES = "SINGLES",
  DOUBLES = "DOUBLES",
}

/**
 * Configuration for each sport format including participation type and limits.
 * maxTeamSize is only defined for team sports and includes bench players.
 * maxParticipants is the max number of teams (team sports) or individual players (individual sports).
 */
export const SportFormatConfig = {
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

export enum SportType {
  BASEBALL = "BASEBALL",
  BASKETBALL = "BASKETBALL",
  FOOTBALL = "FOOTBALL",
  TENNIS = "TENNIS",
  PICKLEBALL = "PICKLEBALL",
}

export enum PickleballScoringType {
  SIDE_OUT = "SIDE_OUT",
  RALLY = "RALLY",
}

export const SportTypeConfig = {
  BASEBALL: {
    formats: [],
    icon: "/sports/baseball.svg",
    participation: ParticipationType.TEAM,
    maxTeamSize: 25,
    maxParticipants: 2,
  },
  BASKETBALL: {
    formats: [SportFormat.FIVE_ON_FIVE, SportFormat.THREE_ON_THREE],
    icon: "/sports/basketball.svg",
  },
  FOOTBALL: {
    formats: [SportFormat.FLAG_FOOTBALL, SportFormat.AMERICAN_FOOTBALL],
    icon: "/sports/football.svg",
  },
  TENNIS: {
    formats: [SportFormat.SINGLES, SportFormat.DOUBLES],
    icon: "/sports/tennis.svg",
  },
  PICKLEBALL: {
    formats: [SportFormat.SINGLES, SportFormat.DOUBLES],
    icon: "/sports/pickleball.svg",
  },
  //   SOFTBALL: [],
  //   SWIM: [],
} as const;

export function getFormats(sport: SportType) {
  return SportTypeConfig[sport].formats;
}

export function getSportIconPath(sport: SportType) {
  return SportTypeConfig[sport].icon;
}

export function getParticipationType(sportFormat: SportFormat) {
  return SportFormatConfig[sportFormat].participation;
}

/**
 * Get the maximum team size for a given sport format.
 * Returns undefined for individual sports.
 */
export function getMaxTeamSize(sportFormat: SportFormat): number | undefined {
  const config = SportFormatConfig[sportFormat];
  return "maxTeamSize" in config ? config.maxTeamSize : undefined;
}

/**
 * Get the maximum number of participants (teams or individuals) for a given sport format.
 */
export function getMaxParticipants(sportFormat: SportFormat): number {
  return SportFormatConfig[sportFormat].maxParticipants;
}

export enum GameSortField {
  START_DATE = "START_DATE",
  END_DATE = "END_DATE",
  GAME_STATUS = "GAME_STATUS",
  DISTANCE = "DISTANCE",
}

export enum GameRole {
  OWNER = "OWNER",
  EDITOR = "EDITOR",
}

export enum GameVisibility {
  PUBLIC = "PUBLIC",
  PROTECTED = "PROTECTED",
  PRIVATE = "PRIVATE",
}

export enum GameInvitationStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  CANCELLED = "CANCELLED",
}

export enum ChatRoomRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

/**
 * Badge variant mapping for chat room role display
 */
export const ChatRoomRoleBadgeVariant = {
  OWNER: "default",
  ADMIN: "secondary",
  MEMBER: "outline",
} as const;

/**
 * Badge variant mapping for game status display
 */
export const GameStatusBadgeVariant = {
  SCHEDULED: "secondary",
  IN_PROGRESS: "default",
  COMPLETE: "outline",
} as const;

/**
 * i18n key mapping for game status display labels
 */
export const GameStatusLabelKey: Record<GameStatus, string> = {
  [GameStatus.IN_PROGRESS]: "game.status.live",
  [GameStatus.SCHEDULED]: "game.status.upcoming",
  [GameStatus.COMPLETE]: "game.status.final",
};

/**
 * i18n key mapping for game status aria-labels (accessible descriptions)
 */
export const GameStatusAriaLabelKey: Record<GameStatus, string> = {
  [GameStatus.IN_PROGRESS]: "game.status.ariaLabel.live",
  [GameStatus.SCHEDULED]: "game.status.ariaLabel.upcoming",
  [GameStatus.COMPLETE]: "game.status.ariaLabel.final",
};

/**
 * Extract the SportFormat value from a GameMetadata union member.
 * Due to GraphQL field conflict resolution, each metadata type uses
 * an aliased format field (basketballFormat, tennisFormat, etc.).
 */
export function getFormatFromMetadata(
  metadata:
    | { __typename: "BaseballGameMetadata" }
    | { __typename: "BasketballGameMetadata"; basketballFormat: string }
    | { __typename: "TennisGameMetadata"; tennisFormat: string }
    | { __typename: "FootballGameMetadata"; footballFormat: string }
    | { __typename: "PickleballGameMetadata"; pickleballFormat: string },
): SportFormat | null {
  switch (metadata.__typename) {
    case "BaseballGameMetadata":
      return null;
    case "BasketballGameMetadata":
      return metadata.basketballFormat as SportFormat;
    case "TennisGameMetadata":
      return metadata.tennisFormat as SportFormat;
    case "FootballGameMetadata":
      return metadata.footballFormat as SportFormat;
    case "PickleballGameMetadata":
      return metadata.pickleballFormat as SportFormat;
  }
}

export function getSportParticipationType(
  sportType: SportType,
  format: SportFormat | null,
): ParticipationType {
  if (format != null) return SportFormatConfig[format].participation;
  const config = SportTypeConfig[sportType];
  return "participation" in config ? config.participation : ParticipationType.TEAM;
}

export function getSportMaxParticipants(
  sportType: SportType,
  format: SportFormat | null,
): number {
  if (format != null) return SportFormatConfig[format].maxParticipants;
  const config = SportTypeConfig[sportType];
  return "maxParticipants" in config ? config.maxParticipants : 2;
}
