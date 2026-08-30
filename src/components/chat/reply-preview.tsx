"use client";

import { Button } from "@/components/ui/button";
import { TypographyMuted, TypographySmall } from "@/components/ui/typography";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

interface ReplyPreviewProps {
  userName: string;
  content: string | null;
  onDismiss?: () => void;
  /** Disable the dismiss control (e.g. while a send is in flight). */
  dismissDisabled?: boolean;
  onClick?: () => void;
}

/**
 * One component, two contexts:
 * - In-bubble quote (message-bubble.tsx): `onClick` only — the whole preview
 *   renders as a keyboard-reachable `<button>` that jumps to (and highlights)
 *   the original message.
 * - Composer reply preview (message-input.tsx): `onDismiss` only — a `<div>`
 *   with a ≥44px dismiss control.
 */
export function ReplyPreview({
  userName,
  content,
  onDismiss,
  dismissDisabled = false,
  onClick,
}: ReplyPreviewProps) {
  const t = useTranslations("chat.message");
  const truncatedContent = content
    ? content.length > 80
      ? `${content.slice(0, 80)}…`
      : content
    : t("deleted");

  const body = (
    <div className="min-w-0 flex-1">
      <TypographySmall className="block truncate font-semibold">
        {userName}
      </TypographySmall>
      <TypographyMuted className="truncate">{truncatedContent}</TypographyMuted>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-2 rounded-md border-l-4 border-primary bg-muted/50 px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {body}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border-l-4 border-primary bg-muted/50 px-3 py-2">
      {body}
      {onDismiss && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-11 shrink-0"
          onClick={onDismiss}
          disabled={dismissDisabled}
          aria-label={t("removeReply")}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
