"use client";

import {
  Attachment,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message";
import { Textarea } from "@/components/ui/textarea";
import type { ChatRoomRole, UserChatMessageNode } from "@/lib/types/chat";
import type { Resource } from "@/lib/types/resource";
import { formatFileSize, isVideoMimeType } from "@/lib/upload-validation";
import { cn, getInitials } from "@/lib/utils";
import { Download, FileIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { formatMessageTime } from "./chat-utils";
import { MessageActionsMenu } from "./message-actions-menu";
import { getReplyPreviewContent } from "./message-preview-utils";
import { ReplyPreview } from "./reply-preview";

/** Image, inline video, or downloadable-file rendering for a media message. */
function MediaContent({ resource }: { resource: Resource }) {
  if (resource.__typename === "ImageResource") {
    return (
      <a
        href={resource.downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded image hosted on the backend file server; converting to next/image requires adding images.remotePatterns in next.config and handling unknown intrinsic dimensions */}
        <img
          src={resource.thumbnailUrl ?? resource.downloadUrl}
          alt={resource.filename}
          className="max-h-64 rounded-md object-cover"
        />
      </a>
    );
  }

  if (isVideoMimeType(resource.mimeType)) {
    return (
      <video
        controls
        preload="metadata"
        className="max-h-64 max-w-full rounded-md"
        src={resource.downloadUrl}
      >
        Your browser does not support the video element.
      </video>
    );
  }

  return (
    <Attachment state="done">
      <AttachmentTrigger
        render={
          <a
            href={resource.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={resource.filename}
          />
        }
      />
      <AttachmentMedia variant="icon">
        <FileIcon />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{resource.filename}</AttachmentTitle>
        <AttachmentDescription>
          {formatFileSize(resource.size)}
        </AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <Download aria-hidden="true" className="size-4 opacity-70" />
      </AttachmentActions>
    </Attachment>
  );
}

interface MessageBubbleProps {
  message: UserChatMessageNode;
  isOwn: boolean;
  /** Avatar + name + time shown; forced true after a day boundary. */
  isGroupStart: boolean;
  currentUserRole: ChatRoomRole | null;
  isEditing: boolean;
  /** Originals deleted live during this session (see conversation-view). */
  deletedMessageIds: ReadonlySet<string>;
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
  isGroupStart,
  currentUserRole,
  isEditing,
  deletedMessageIds,
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
  const displayName = message.user.displayName;
  const initials = getInitials(message.user);
  const time = formatMessageTime(message.createdDate, locale, timeLabels);

  const handleSaveEdit = () => {
    const trimmedContent = editContent.trim();
    if (
      trimmedContent &&
      isTextMessage &&
      trimmedContent !== message.content
    ) {
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

  /** The bubble's body: deleted placeholder, editor, text, or media. */
  function renderBody() {
    if (isDeleted) {
      return <div>{t("deleted")}</div>;
    }

    if (message.__typename === "TextChatMessage") {
      if (isEditing) {
        return (
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
        );
      }

      return (
        <>
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
          {message.updatedDate && (
            <span className="ml-2 text-xs opacity-70">{t("edited")}</span>
          )}
        </>
      );
    }

    return (
      <div className="space-y-2">
        <MediaContent resource={message.resource} />
        {message.caption && (
          <div className="whitespace-pre-wrap break-words">
            {message.caption}
          </div>
        )}
      </div>
    );
  }

  return (
    <Message align={isOwn ? "end" : "start"} id={`message-${message.id}`}>
      {!isOwn &&
        (isGroupStart ? (
          <MessageAvatar>
            <Avatar size="sm">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </MessageAvatar>
        ) : (
          <div className="w-8 shrink-0" aria-hidden="true" />
        ))}

      <MessageContent>
        {isGroupStart && (
          <MessageHeader className="gap-2">
            <span className="font-semibold text-foreground">
              {displayName}
            </span>
            <span>{time}</span>
          </MessageHeader>
        )}

        <Bubble
          variant={isOwn ? "default" : "muted"}
          align={isOwn ? "end" : "start"}
        >
          <BubbleContent className={cn(isDeleted && "italic opacity-70")}>
            {message.replyTo && (
              <div className="mb-2">
                <ReplyPreview
                  userName={message.replyTo.user.displayName}
                  content={getReplyPreviewContent(
                    message.replyTo,
                    t,
                    deletedMessageIds,
                  )}
                  onClick={() => onScrollToReply(message.replyTo!.id)}
                />
              </div>
            )}

            {renderBody()}
          </BubbleContent>

          {!isDeleted && !isEditing && (
            <MessageActionsMenu
              isOwn={isOwn}
              canDelete={canDelete}
              onReply={onReply}
              onEdit={isOwn && isTextMessage ? onStartEdit : undefined}
              onDelete={onDelete}
              className={cn(
                "absolute top-0 -translate-y-1/2",
                "group-data-[align=end]/bubble:left-0 group-data-[align=end]/bubble:-translate-x-1/2",
                "group-data-[align=start]/bubble:right-0 group-data-[align=start]/bubble:translate-x-1/2",
              )}
            />
          )}
        </Bubble>

        {!isGroupStart && !isDeleted && (
          <MessageFooter className="opacity-0 group-hover/message:opacity-100 group-focus-within/message:opacity-100 motion-safe:transition-opacity">
            {time}
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  );
}
