"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  onSendText: (content: string, replyToId?: string) => void;
  onSendMedia: (file: File) => Promise<void>;
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
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<
    string | null
  >(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Cleanup preview URL on unmount or file change
  useEffect(() => {
    return () => {
      if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
    };
  }, [attachmentPreviewUrl]);

  const handleSendText = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isSubmitting || disabled) return;

    setIsSubmitting(true);
    try {
      await onSendText(trimmedContent, replyTo?.id);
      setContent("");
      onClearReply();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMedia = async () => {
    if (!attachedFile || isUploadingMedia) return;
    setIsUploadingMedia(true);
    try {
      await onSendMedia(attachedFile);
      // Success: clear attachment
      if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
      setAttachedFile(null);
      setAttachmentPreviewUrl(null);
      setAttachmentError(null);
    } catch {
      // Error already toasted by ConversationView.handleSendMedia
      if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
      setAttachedFile(null);
      setAttachmentPreviewUrl(null);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleSend = async () => {
    if (attachedFile) {
      await handleSendMedia();
    } else {
      await handleSendText();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleFileSelected = useCallback(
    (file: File) => {
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
        // Clear reply when attaching a file
        onClearReply();
        return;
      }

      setAttachmentError(null);
      setAttachedFile(file);

      // Create preview URL for images
      if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
      if (isImageMimeType(file.type)) {
        setAttachmentPreviewUrl(URL.createObjectURL(file));
      } else {
        setAttachmentPreviewUrl(null);
      }

      // Clear reply when attaching a file
      onClearReply();
    },
    [attachmentPreviewUrl, onClearReply, tMedia],
  );

  const handleRemoveAttachment = useCallback(() => {
    if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
    setAttachedFile(null);
    setAttachmentPreviewUrl(null);
    setAttachmentError(null);
  }, [attachmentPreviewUrl]);

  const isSendDisabled = attachedFile
    ? !!attachmentError || disabled || isUploadingMedia
    : !content.trim() || disabled || isSubmitting;

  return (
    <div className="border-t bg-background p-4">
      {replyTo && !attachedFile && (
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
          />
        </div>
      )}

      <div className="flex gap-2">
        <ChatAttachmentMenu
          onFileSelected={handleFileSelected}
          disabled={disabled || isSubmitting || isUploadingMedia}
        />

        {!attachedFile && (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            disabled={disabled || isSubmitting}
            className="min-h-[60px] resize-none"
          />
        )}

        <Button
          onClick={handleSend}
          disabled={isSendDisabled}
          size="icon"
          className="h-[60px] w-[60px] shrink-0"
        >
          {isUploadingMedia ? (
            <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
          ) : (
            <SendHorizontal className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
