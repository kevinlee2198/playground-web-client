"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessageNode } from "@/lib/types/chat";
import { SendHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ReplyPreview } from "./reply-preview";

interface MessageInputProps {
  onSend: (content: string, replyToId?: string) => void;
  replyTo: ChatMessageNode | null;
  onClearReply: () => void;
  disabled?: boolean;
}

export function MessageInput({
  onSend,
  replyTo,
  onClearReply,
  disabled,
}: MessageInputProps) {
  const t = useTranslations("chat.message");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSend = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isSubmitting || disabled) return;

    setIsSubmitting(true);
    try {
      await onSend(trimmedContent, replyTo?.id);
      setContent("");
      onClearReply();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-background p-4">
      {replyTo && (
        <div className="mb-2">
          <ReplyPreview
            userName={`${replyTo.user.firstName} ${replyTo.user.lastName}`}
            content={replyTo.content}
            onDismiss={onClearReply}
          />
        </div>
      )}
      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("placeholder")}
          disabled={disabled || isSubmitting}
          className="min-h-[60px] resize-none"
        />
        <Button
          onClick={handleSend}
          disabled={!content.trim() || disabled || isSubmitting}
          size="icon"
          className="h-[60px] w-[60px] shrink-0"
        >
          <SendHorizontal className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
