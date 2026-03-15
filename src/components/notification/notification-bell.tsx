"use client";

import {
  fetchNotifications,
  markNotificationsAsRead,
} from "@/components/notification/actions";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotificationSubscription } from "@/hooks/use-notification-subscription";
import { usePathname } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import type {
  Notification,
  NotificationPageInfo,
} from "@/lib/types/notification";
import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { NotificationList } from "./notification-list";

export function NotificationBell() {
  const { data: session } = useSession();
  const t = useTranslations("notifications");
  const pathname = usePathname();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pageInfo, setPageInfo] = useState<NotificationPageInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoadTransition] = useTransition();
  const [isLoadingMore, startLoadMore] = useTransition();

  // Close popover when pathname changes (FR-3.4)
  // Using the "state during render" pattern (see navbar-search.tsx) to avoid
  // triggering the react-hooks/set-state-in-effect lint rule.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (isOpen) {
      setIsOpen(false);
    }
  }

  // In-flight set for deduplication and race-safe rollback
  const markingInFlightRef = useRef(new Set<string>());

  const loadNotifications = useCallback(() => {
    startLoadTransition(async () => {
      setError(null);
      const result = await fetchNotifications(10);
      if (result.success) {
        setNotifications(result.edges?.map((e) => e.node) ?? []);
        setPageInfo(result.pageInfo);
      } else {
        setError(result.error);
      }
    });
  }, []);

  // Fetch on mount
  useEffect(() => {
    if (session?.user) {
      loadNotifications();
    }
  }, [session?.user, loadNotifications]);

  // Fallback polling every 5 minutes
  useEffect(() => {
    if (!session?.user) return;

    const POLL_INTERVAL = 5 * 60 * 1000;
    const intervalId = setInterval(() => {
      loadNotifications();
    }, POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [session?.user, loadNotifications]);

  // Real-time WebSocket subscription
  const handleIncomingNotification = useCallback(
    (notification: Notification) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notification.id)) {
          return prev;
        }
        return [notification, ...prev];
      });
    },
    [],
  );

  useNotificationSubscription({
    enabled: !!session?.user,
    onNotification: handleIncomingNotification,
    onReconnect: loadNotifications,
  });

  const handleMarkAsRead = useCallback(async (id: string): Promise<void> => {
    // Skip if already in-flight for this id
    if (markingInFlightRef.current.has(id)) return;
    markingInFlightRef.current.add(id);

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );

    const result = await markNotificationsAsRead([id]);
    markingInFlightRef.current.delete(id);

    if (!result.success && !markingInFlightRef.current.has(id)) {
      // Silent rollback per ERR-1.1, only if no subsequent call is in-flight
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)),
      );
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async (): Promise<void> => {
    const unreadIds = notifications
      .filter((n) => !n.isRead)
      .map((n) => n.id)
      .filter((id) => !markingInFlightRef.current.has(id));

    if (unreadIds.length === 0) return;

    for (const id of unreadIds) markingInFlightRef.current.add(id);

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (unreadIds.includes(n.id) ? { ...n, isRead: true } : n)),
    );

    const result = await markNotificationsAsRead(unreadIds);
    for (const id of unreadIds) markingInFlightRef.current.delete(id);

    if (!result.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          unreadIds.includes(n.id) && !markingInFlightRef.current.has(n.id)
            ? { ...n, isRead: false }
            : n,
        ),
      );
    }
  }, [notifications]);

  if (!session?.user) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (open) {
      // Re-fetch fresh data when opening
      loadNotifications();
    }
  }

  function handleLoadMore() {
    const cursor = pageInfo?.endCursor;
    if (!cursor) return;
    startLoadMore(async () => {
      const result = await fetchNotifications(10, cursor);
      if (result.success) {
        setNotifications((prev) => [
          ...prev,
          ...(result.edges?.map((e) => e.node) ?? []),
        ]);
        setPageInfo(result.pageInfo);
      } else {
        setError(result.error);
      }
    });
  }

  const displayCount = unreadCount > 99 ? "99+" : unreadCount.toString();

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span
                className={cn(
                  "absolute -right-1 -top-1 flex items-center justify-center rounded-full bg-live text-live-foreground text-xs font-display font-bold",
                  unreadCount > 9 ? "h-5 min-w-5 px-1" : "h-4 w-4",
                )}
              >
                {displayCount}
              </span>
            )}
            <span className="sr-only">{t("title")}</span>
          </Button>
        }
      />
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">{t("title")}</h3>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="text-xs text-primary hover:underline"
            >
              {t("markAllRead")}
            </button>
          )}
        </div>
        <ScrollArea className="max-h-[400px] overscroll-contain">
          <NotificationList
            notifications={notifications}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            error={error}
            hasNextPage={pageInfo?.hasNextPage ?? false}
            onLoadMore={handleLoadMore}
            onMarkAsRead={handleMarkAsRead}
            onRetry={loadNotifications}
          />
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
