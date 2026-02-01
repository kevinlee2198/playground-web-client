/** A notification as returned by the GraphQL API */
export interface Notification {
  id: string;
  body: string;
  isRead: boolean;
  createdDate: string;
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
  error: string | null;
}
