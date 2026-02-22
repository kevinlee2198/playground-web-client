"use client";

import { TypographySmall } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import type { KnownNotification, Notification } from "@/lib/types/notification";
import { isKnownNotificationType } from "@/lib/types/notification";
import { cn } from "@/lib/utils";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";

const HOVER_READ_DELAY_MS = 600;

interface NotificationContent {
  /** i18n key prefix under notificationTemplates, e.g. "friendRequestReceived" */
  templateKey: string | null;
  /** The href for the Link wrapper */
  href: string | null;
  /** Parameters to pass to t.rich() for the body */
  richParams: Record<string, string>;
}

const FALLBACK_CONTENT: NotificationContent = {
  templateKey: null,
  href: null,
  richParams: {},
};

function getKnownNotificationContent(
  notification: KnownNotification,
  tSports: (key: string) => string,
): NotificationContent {
  switch (notification.__typename) {
    case "FriendRequestReceivedNotification":
      if (!notification.sender) return FALLBACK_CONTENT;
      return {
        templateKey: "friendRequestReceived",
        href: `/user/${notification.sender.username}`,
        richParams: { displayName: notification.sender.displayName },
      };
    case "FriendRequestAcceptedNotification":
      if (!notification.accepter) return FALLBACK_CONTENT;
      return {
        templateKey: "friendRequestAccepted",
        href: `/user/${notification.accepter.username}`,
        richParams: { displayName: notification.accepter.displayName },
      };
    case "GameStartedNotification":
      if (!notification.game) return FALLBACK_CONTENT;
      return {
        templateKey: "gameStarted",
        href: `/game/${notification.game.id}`,
        richParams: { sportType: tSports(notification.game.sportType) },
      };
  }
}

function getNotificationContent(
  notification: Notification,
  tSports: (key: string) => string,
): NotificationContent {
  if (!isKnownNotificationType(notification)) {
    return FALLBACK_CONTENT;
  }
  return getKnownNotificationContent(notification, tSports);
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => Promise<void>;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
}: NotificationItemProps) {
  const tNotif = useTranslations("notificationTemplates");
  const tSports = useTranslations("sports");
  const formatter = useFormatter();
  const now = useNow();
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const content = getNotificationContent(notification, tSports);

  const relativeTime = formatter.relativeTime(
    new Date(notification.createdDate),
    now,
  );

  // Clean up hover timer on unmount (e.g., popover closes during debounce)
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (notification.isRead) return;
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = setTimeout(() => {
      void onMarkAsRead(notification.id);
    }, HOVER_READ_DELAY_MS);
  }, [notification.isRead, notification.id, onMarkAsRead]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  // On touch devices, mark as read immediately on click (FR-2.5)
  const handleClick = useCallback(() => {
    if (!notification.isRead) {
      // Clear any pending hover timer
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      void onMarkAsRead(notification.id);
    }
  }, [notification.isRead, notification.id, onMarkAsRead]);

  const innerContent = (
    <>
      {/* Unread dot indicator */}
      <div className="mt-1.5 flex-shrink-0">
        {!notification.isRead ? (
          <div className="h-2 w-2 rounded-full bg-primary" />
        ) : (
          <div className="h-2 w-2" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {content.templateKey && (
          <TypographySmall>
            {tNotif(`${content.templateKey}.title`)}
          </TypographySmall>
        )}
        <p className="text-sm">
          {content.templateKey
            ? tNotif.rich(`${content.templateKey}.body`, {
                ...content.richParams,
                link: (chunks) => (
                  <strong className="font-semibold">{chunks}</strong>
                ),
              })
            : tNotif("unknown.body")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{relativeTime}</p>
      </div>
    </>
  );

  const sharedClasses = cn(
    "flex items-start gap-3 px-4 py-3 transition-colors touch-manipulation",
    !notification.isRead && "bg-accent/50",
    content.href && "cursor-pointer hover:bg-accent/80",
    !content.href && !notification.isRead && "cursor-pointer",
  );

  if (content.href) {
    return (
      <Link
        href={content.href}
        className={sharedClasses}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {innerContent}
      </Link>
    );
  }

  return (
    <div
      className={sharedClasses}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {innerContent}
    </div>
  );
}
