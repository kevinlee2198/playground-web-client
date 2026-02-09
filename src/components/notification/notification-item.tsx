"use client";

import { Button } from "@/components/ui/button";
import type {
  MarkNotificationsAsReadResult,
  Notification,
} from "@/lib/types/notification";
import { cn } from "@/lib/utils";
import DOMPurify from "isomorphic-dompurify";
import { Check, Loader2 } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useState } from "react";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => Promise<MarkNotificationsAsReadResult>;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
}: NotificationItemProps) {
  const t = useTranslations("notifications");
  const formatter = useFormatter();
  const [isMarking, setIsMarking] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);
  const now = useNow();

  const sanitizedBody = DOMPurify.sanitize(notification.body, {
    ALLOWED_TAGS: [
      "b",
      "i",
      "em",
      "strong",
      "a",
      "span",
      "p",
      "br",
      "ul",
      "ol",
      "li",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  });

  const relativeTime = formatter.relativeTime(
    new Date(notification.createdDate),
    now,
  );

  async function handleMarkAsRead() {
    setIsMarking(true);
    setMarkError(null);
    const result = await onMarkAsRead(notification.id);
    if (!result.success) {
      setMarkError(t("markAsReadError"));
    }
    setIsMarking(false);
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors",
        !notification.isRead && "bg-accent/50",
      )}
    >
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
        <div
          className="text-sm [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_img]:h-auto"
          dangerouslySetInnerHTML={{ __html: sanitizedBody }}
        />
        <p className="mt-1 text-xs text-muted-foreground">{relativeTime}</p>
        {markError && (
          <p className="mt-1 text-xs text-destructive">{markError}</p>
        )}
      </div>

      {/* Mark as read button */}
      {!notification.isRead && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0"
          onClick={handleMarkAsRead}
          disabled={isMarking}
          title={t("markAsRead")}
        >
          {isMarking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </Button>
      )}
    </div>
  );
}
