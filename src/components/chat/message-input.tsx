"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TypographyMuted } from "@/components/ui/typography";
import { CHAT_MESSAGE_MAX_LENGTH } from "@/lib/constants";
import type { UserChatMessageNode } from "@/lib/types/chat";
import {
  getMaxSizeLabel,
  isImageMimeType,
  validateFile,
} from "@/lib/upload-validation";
import { Loader2, SendHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { ChatAttachmentMenu } from "./chat-attachment-menu";
import { ChatAttachmentPreview } from "./chat-attachment-preview";
import { getMessagePreviewContent } from "./message-preview-utils";
import { ReplyPreview } from "./reply-preview";

interface MessageInputProps {
  onSendText: (content: string, replyToId?: string) => Promise<void>;
  onSendMedia: (
    file: File,
    caption?: string,
    replyToId?: string,
  ) => Promise<void>;
  replyTo: UserChatMessageNode | null;
  onClearReply: () => void;
  disabled?: boolean;
}

export function MessageInput({
  onSendText,
  onSendMedia,
  replyTo,
  onClearReply,
  disabled,
}: MessageInputProps) {
  const t = useTranslations("chat.message");
  const tMedia = useTranslations("chat.media");

  // `content` doubles as text AND caption (single field) — the composer is a
  // coexistence state machine: reply preview, attachment preview, and this
  // field may all be present at once.
  const [content, setContent] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<
    string | null
  >(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const trimmed = content.trim();
  const isOverLimit = content.length > CHAT_MESSAGE_MAX_LENGTH;
  const hasFile = attachedFile !== null;
  const canSend =
    !isSending &&
    !disabled &&
    !isOverLimit &&
    (hasFile ? !attachmentError : trimmed.length > 0);

  // Cleanup preview URL on unmount or file change
  useEffect(() => {
    return () => {
      if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
    };
  }, [attachmentPreviewUrl]);

  const handleSend = async () => {
    if (!canSend) return;
    const urlAtSend = attachmentPreviewUrl; // capture for safe revoke
    setIsSending(true);
    try {
      if (hasFile) {
        // media + caption + replyToId, one message
        await onSendMedia(attachedFile!, trimmed || undefined, replyTo?.id);
      } else {
        await onSendText(trimmed, replyTo?.id);
      }
      // Success only: clear staged state and revoke the URL captured at
      // send start (never a newly-staged URL, never leaked).
      if (urlAtSend) URL.revokeObjectURL(urlAtSend);
      setContent("");
      setAttachedFile(null);
      setAttachmentPreviewUrl(null);
      setAttachmentError(null);
      onClearReply();
    } catch {
      // Failure: KEEP content + attachment + reply for retry (toast
      // surfaced by conversation-view). DM send-disabled: composer will be
      // replaced by the banner; nothing to clear here.
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
    // Shift+Enter: default newline behavior.
  };

  const handleFileSelected = useCallback(
    (file: File) => {
      if (isSending) return; // defense in depth against a queued event mid-send

      const validation = validateFile(file, "chatMedia");
      if (!validation.valid) {
        setAttachmentError(
          validation.error === "invalidType"
            ? tMedia("errors.invalidType")
            : tMedia("errors.fileTooLarge", {
                limit: getMaxSizeLabel(file.type),
              }),
        );
        setAttachedFile(file);
        if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
        setAttachmentPreviewUrl(null);
        return;
      }

      setAttachmentError(null);
      setAttachedFile(file);

      if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
      setAttachmentPreviewUrl(
        isImageMimeType(file.type) ? URL.createObjectURL(file) : null,
      );

      // Reply and typed content are intentionally left untouched: attaching
      // media no longer clears an active reply, and a caption can be typed
      // alongside staged media. No programmatic focus (no forced mobile
      // keyboard).
    },
    [isSending, attachmentPreviewUrl, tMedia],
  );

  const handleRemoveAttachment = useCallback(() => {
    if (isSending) return; // defense in depth against a queued event mid-send

    if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
    setAttachedFile(null);
    setAttachmentPreviewUrl(null);
    setAttachmentError(null);
    // `content` is retained — the caption becomes ordinary text.
  }, [isSending, attachmentPreviewUrl]);

  return (
    <div className="border-t bg-background p-4">
      {replyTo && (
        <div className="mb-2">
          <ReplyPreview
            userName={replyTo.user.displayName}
            content={getMessagePreviewContent(replyTo, t)}
            onDismiss={onClearReply}
          />
        </div>
      )}

      {attachedFile && (
        <div className="mb-2">
          <ChatAttachmentPreview
            file={attachedFile}
            previewUrl={attachmentPreviewUrl}
            error={attachmentError}
            onRemove={handleRemoveAttachment}
            disabled={isSending}
          />
        </div>
      )}

      <div className="flex gap-2">
        <ChatAttachmentMenu
          onFileSelected={handleFileSelected}
          disabled={disabled || isSending}
        />

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={hasFile ? t("captionPlaceholder") : t("placeholder")}
          disabled={disabled || isSending}
          className="min-h-[60px] resize-none"
        />

        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          className="h-[60px] w-[60px] shrink-0"
          aria-label={t("send")}
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
          ) : (
            <SendHorizontal className="h-5 w-5" />
          )}
        </Button>
      </div>

      {isOverLimit && (
        <TypographyMuted className="mt-1 text-destructive">
          {hasFile
            ? t("captionTooLong", { limit: CHAT_MESSAGE_MAX_LENGTH })
            : t("messageTooLong", { limit: CHAT_MESSAGE_MAX_LENGTH })}
        </TypographyMuted>
      )}
    </div>
  );
}
