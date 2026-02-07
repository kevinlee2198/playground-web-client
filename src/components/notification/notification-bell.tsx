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
import { useSession } from "@/lib/auth-client";
import type {
  Notification,
  NotificationPageInfo,
} from "@/lib/types/notification";
import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";
import { NotificationList } from "./notification-list";

export function NotificationBell() {
  const { data: session } = useSession();
  const t = useTranslations("notifications");

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pageInfo, setPageInfo] = useState<NotificationPageInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoadTransition] = useTransition();
  const [isLoadingMore, startLoadMore] = useTransition();

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

  async function handleMarkAsRead(id: string) {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );

    const result = await markNotificationsAsRead([id]);
    if (!result.success) {
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)),
      );
      // Error is surfaced per-item in NotificationItem
    }
    return result;
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
                  "absolute -right-1 -top-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-medium",
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
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">{t("title")}</h3>
        </div>
        <ScrollArea className="max-h-[400px]">
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
