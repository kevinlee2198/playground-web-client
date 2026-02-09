"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessageNode, ChatRoomRole } from "@/lib/types/chat";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { formatMessageTime } from "./chat-utils";
import { MessageActionsMenu } from "./message-actions-menu";
import { ReplyPreview } from "./reply-preview";

interface MessageBubbleProps {
  message: ChatMessageNode;
  isOwn: boolean;
  showSender: boolean;
  isFirstInGroup: boolean;
  currentUserRole: ChatRoomRole | null;
  isEditing: boolean;
  onReply: () => void;
  onStartEdit: () => void;
  onSaveEdit: (content: string) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onScrollToReply: (messageId: string) => void;
}

export function MessageBubble({
  message,
  isOwn,
  showSender,
  isFirstInGroup,
  currentUserRole,
  isEditing,
  onReply,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onScrollToReply,
}: MessageBubbleProps) {
  const t = useTranslations("chat.message");
  const tTime = useTranslations("chat.time");
  const locale = useLocale();
  const timeLabels = {
    yesterdayWithTime: (time: string) => tTime("yesterdayWithTime", { time }),
  };
  const [editContent, setEditContent] = useState(message.content ?? "");

  const isDeleted = message.deletedDate !== null;
  const isSystemMessage = message.isSystemMessage;
  const canDelete = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  // System messages: centered, muted, italic
  if (isSystemMessage) {
    return (
      <div className="flex justify-center py-2">
        <div className="text-muted-foreground italic text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  const userName = `${message.user.firstName} ${message.user.lastName}`;
  const initials =
    `${message.user.firstName[0]}${message.user.lastName[0]}`.toUpperCase();

  const handleSaveEdit = () => {
    const trimmedContent = editContent.trim();
    if (trimmedContent && trimmedContent !== message.content) {
      onSaveEdit(trimmedContent);
    } else {
      onCancelEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      onCancelEdit();
    }
  };

  return (
    <div
      className={cn(
        "group flex gap-3 px-4 py-1",
        isOwn ? "justify-end" : "justify-start",
        isFirstInGroup && "mt-2",
      )}
      id={`message-${message.id}`}
    >
      {!isOwn && (
        <div className="flex flex-col items-center">
          {showSender ? (
            <Avatar size="sm">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-6 w-6" />
          )}
        </div>
      )}

      <div className={cn("flex max-w-[70%] flex-col", isOwn && "items-end")}>
        {showSender && (
          <div
            className={cn(
              "mb-1 flex items-center gap-2 px-3 text-sm",
              isOwn && "flex-row-reverse",
            )}
          >
            <span className="font-semibold">{userName}</span>
            <span className="text-muted-foreground text-xs">
              {formatMessageTime(message.createdDate, locale, timeLabels)}
            </span>
          </div>
        )}

        <div
          className={cn(
            "relative flex items-start gap-2 rounded-lg px-3 py-2",
            isOwn
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground",
            isDeleted && "italic opacity-70",
          )}
        >
          <div className="min-w-0 flex-1">
            {message.replyTo && (
              <div className="mb-2">
                <ReplyPreview
                  userName={`${message.replyTo.user.firstName} ${message.replyTo.user.lastName}`}
                  content={message.replyTo.content}
                  onClick={() => onScrollToReply(message.replyTo!.id)}
                />
              </div>
            )}

            {isDeleted ? (
              <div className="text-sm">{t("deleted")}</div>
            ) : isEditing ? (
              <div className="flex flex-col gap-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[60px] w-full resize-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit}>
                    {t("save")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={onCancelEdit}>
                    {t("cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="whitespace-pre-wrap break-words text-sm">
                  {message.content}
                </div>
                {message.updatedDate && (
                  <span className="ml-2 text-xs opacity-70">{t("edited")}</span>
                )}
              </>
            )}

            {!showSender && !isDeleted && (
              <div className="mt-1 text-xs opacity-0 group-hover:opacity-50">
                {formatMessageTime(message.createdDate, locale, timeLabels)}
              </div>
            )}
          </div>

          {!isDeleted && !isEditing && (
            <MessageActionsMenu
              isOwn={isOwn}
              canDelete={canDelete}
              onReply={onReply}
              onEdit={isOwn ? onStartEdit : undefined}
              onDelete={onDelete}
            />
          )}
        </div>
      </div>

      {isOwn && <div className="h-6 w-6" />}
    </div>
  );
}
