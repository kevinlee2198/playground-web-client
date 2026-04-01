"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  ChatMessageReplyTo,
  ChatRoomRole,
  UserChatMessageNode,
} from "@/lib/types/chat";
import { formatFileSize, isVideoMimeType } from "@/lib/upload-validation";
import { cn, getInitials } from "@/lib/utils";
import { Download, FileIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { formatMessageTime } from "./chat-utils";
import { MessageActionsMenu } from "./message-actions-menu";
import { ReplyPreview } from "./reply-preview";

interface MessageBubbleProps {
  message: UserChatMessageNode;
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

function getReplyPreviewContent(
  replyTo: ChatMessageReplyTo,
  t: (key: string) => string,
): string {
  if (replyTo.__typename === "TextChatMessage") {
    return replyTo.content ?? t("deleted");
  }
  // MediaChatMessage reply
  if (replyTo.resource.__typename === "ImageResource") {
    return replyTo.caption ?? t("imageAttachment");
  }
  return replyTo.caption ?? t("fileAttachment");
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
  const [editContent, setEditContent] = useState(
    message.__typename === "TextChatMessage" ? (message.content ?? "") : "",
  );

  const isDeleted = message.deletedDate !== null;
  const canDelete = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const isTextMessage = message.__typename === "TextChatMessage";

  const userName = message.user.displayName;
  const initials = getInitials(message.user);

  const handleSaveEdit = () => {
    const trimmedContent = editContent.trim();
    if (trimmedContent && isTextMessage && trimmedContent !== message.content) {
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
        "flex gap-3 px-4 py-1",
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

      <div className={cn("group/row flex max-w-[70%] items-end gap-2", isOwn && "flex-row-reverse")}>
        <div className={cn("flex min-w-0 flex-col", isOwn && "items-end")}>
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
            "group relative w-fit max-w-full rounded-lg px-3 py-2 before:pointer-events-none before:absolute before:-inset-x-4 before:-top-4 before:-bottom-1 before:content-[''] before:group-hover:pointer-events-auto",
            isOwn
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground",
            isDeleted && "italic opacity-70",
          )}
        >
          <div className="min-w-0">
            {message.replyTo && (
              <div className="mb-2">
                <ReplyPreview
                  userName={message.replyTo.user.displayName}
                  content={getReplyPreviewContent(message.replyTo, t)}
                  onClick={() => onScrollToReply(message.replyTo!.id)}
                />
              </div>
            )}

            {isDeleted ? (
              <div className="text-sm">{t("deleted")}</div>
            ) : isEditing && isTextMessage ? (
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
            ) : isTextMessage ? (
              <>
                <div className="whitespace-pre-wrap break-words text-sm">
                  {message.content}
                </div>
                {message.updatedDate && (
                  <span className="ml-2 text-xs opacity-70">{t("edited")}</span>
                )}
              </>
            ) : (
              // MediaChatMessage
              <div className="space-y-2">
                {message.resource.__typename === "ImageResource" ? (
                  <a
                    href={message.resource.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={
                        message.resource.thumbnailUrl ??
                        message.resource.downloadUrl
                      }
                      alt={message.resource.filename}
                      className="max-h-64 rounded-md object-cover"
                    />
                  </a>
                ) : isVideoMimeType(message.resource.mimeType) ? (
                  <video
                    controls
                    preload="metadata"
                    className="max-h-64 max-w-full rounded-md"
                    src={message.resource.downloadUrl}
                  >
                    Your browser does not support the video element.
                  </video>
                ) : (
                  <a
                    href={message.resource.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center gap-3 rounded-md border p-3",
                      isOwn ? "border-primary-foreground/20" : "border-border",
                    )}
                  >
                    <FileIcon className="h-8 w-8 shrink-0 opacity-70" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {message.resource.filename}
                      </div>
                      <div className="text-xs opacity-70">
                        {formatFileSize(message.resource.size)}
                      </div>
                    </div>
                    <Download className="h-4 w-4 shrink-0 opacity-70" />
                  </a>
                )}
                {message.caption && (
                  <div className="whitespace-pre-wrap break-words text-sm">
                    {message.caption}
                  </div>
                )}
              </div>
            )}

          </div>

          {!isDeleted && !isEditing && (
            <div
              className={cn(
                "absolute top-0 -translate-y-1/2",
                isOwn ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2",
              )}
            >
              <MessageActionsMenu
                isOwn={isOwn}
                canDelete={canDelete}
                onReply={onReply}
                onEdit={isOwn && isTextMessage ? onStartEdit : undefined}
                onDelete={onDelete}
              />
            </div>
          )}
        </div>
        </div>

        {!showSender && !isDeleted && (
          <span className="shrink-0 text-xs text-muted-foreground opacity-0 group-hover/row:opacity-100">
            {formatMessageTime(message.createdDate, locale, timeLabels)}
          </span>
        )}
      </div>

      {isOwn && <div className="h-6 w-6" />}
    </div>
  );
}
