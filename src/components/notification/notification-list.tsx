"use client";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { Notification } from "@/lib/types/notification";
import { Inbox, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { NotificationItem } from "./notification-item";

interface NotificationListProps {
  notifications: Notification[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onMarkAsRead: (id: string) => Promise<void>;
  onRetry: () => void;
}

export function NotificationList({
  notifications,
  isLoading,
  isLoadingMore,
  error,
  hasNextPage,
  onLoadMore,
  onMarkAsRead,
  onRetry,
}: NotificationListProps) {
  const t = useTranslations("notifications");

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="divide-y">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 px-4 py-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  // Error state (no data loaded)
  if (error && notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-8">
        <p className="text-sm text-destructive">{t("error")}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  // Empty state
  if (notifications.length === 0) {
    return (
      <Empty className="border-0 py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox />
          </EmptyMedia>
          <EmptyDescription>{t("empty")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  // Notification list
  return (
    <div className="divide-y">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkAsRead={onMarkAsRead}
        />
      ))}

      {/* Load more error */}
      {error && notifications.length > 0 && (
        <div className="flex items-center justify-center gap-2 px-4 py-3">
          <p className="text-xs text-destructive">{t("error")}</p>
          <Button variant="outline" size="sm" onClick={onLoadMore}>
            {t("retry")}
          </Button>
        </div>
      )}

      {/* Load more button */}
      {hasNextPage && !error && (
        <div className="flex justify-center px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
