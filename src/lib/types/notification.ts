import { SportType } from "@/lib/constants";

/** Shared fields from the Notification interface */
interface BaseNotification {
  id: string;
  isRead: boolean;
  createdDate: string;
}

/** User fields needed for follower/game notifications */
export interface NotificationUser {
  id: number;
  username: string;
  displayName: string;
}

/** Game fields needed for game-related notifications */
export interface NotificationGame {
  id: string;
  sportType: SportType;
}

export interface NewFollowerNotification extends BaseNotification {
  __typename: "NewFollowerNotification";
  follower: NotificationUser;
}

export interface GameStartedNotification extends BaseNotification {
  __typename: "GameStartedNotification";
  game: NotificationGame;
}

export interface GameInvitationReceivedNotification extends BaseNotification {
  __typename: "GameInvitationReceivedNotification";
  inviter: NotificationUser;
  game: NotificationGame;
  invitation: { id: string } | null;
}

export interface FollowRequestReceivedNotification extends BaseNotification {
  __typename: "FollowRequestReceivedNotification";
  requester: NotificationUser;
  followRequest: { id: string } | null;
}

export interface FollowRequestApprovedNotification extends BaseNotification {
  __typename: "FollowRequestApprovedNotification";
  approver: NotificationUser;
}

/** Known notification types that the frontend can render with full content */
export type KnownNotification =
  | NewFollowerNotification
  | GameStartedNotification
  | GameInvitationReceivedNotification
  | FollowRequestReceivedNotification
  | FollowRequestApprovedNotification;

/**
 * Discriminated union of all known notification types plus a catch-all.
 * The catch-all uses `BaseNotification & { __typename: string }` so that
 * unknown types from the backend (not matching any literal) are accepted
 * without breaking the discriminated union narrowing for known types.
 */
export type Notification =
  | KnownNotification
  | (BaseNotification & { __typename: string });

/** Type guard to narrow Notification to a known concrete type */
export function isKnownNotificationType(
  n: Notification,
): n is KnownNotification {
  return (
    n.__typename === "NewFollowerNotification" ||
    n.__typename === "GameStartedNotification" ||
    n.__typename === "GameInvitationReceivedNotification" ||
    n.__typename === "FollowRequestReceivedNotification" ||
    n.__typename === "FollowRequestApprovedNotification"
  );
}

export interface NotificationEdge {
  cursor: string;
  node: Notification;
}

export interface NotificationPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface NotificationConnection {
  edges: NotificationEdge[];
  pageInfo: NotificationPageInfo;
}

/** A real-time notification event from the GraphQL subscription */
export interface NotificationEvent {
  notification: Notification;
}

/** Result shape returned by the fetchNotifications server action */
export interface FetchNotificationsResult {
  success: boolean;
  edges: NotificationEdge[] | null;
  pageInfo: NotificationPageInfo | null;
  error: string | null;
}

/** Result shape returned by the markNotificationsAsRead server action */
export interface MarkNotificationsAsReadResult {
  success: boolean;
  notifications: Notification[] | null;
  errorType?: string;
  message?: string;
}
