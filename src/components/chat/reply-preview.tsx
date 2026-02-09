"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ReplyPreviewProps {
  userName: string;
  content: string | null;
  onDismiss?: () => void;
  onClick?: () => void;
}

export function ReplyPreview({
  userName,
  content,
  onDismiss,
  onClick,
}: ReplyPreviewProps) {
  const truncatedContent = content
    ? content.length > 80
      ? `${content.slice(0, 80)}...`
      : content
    : "[Message deleted]";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border-l-4 border-primary bg-muted/50 px-3 py-2",
        onClick && "cursor-pointer hover:bg-muted",
      )}
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{userName}</div>
        <div className="truncate text-sm text-muted-foreground">
          {truncatedContent}
        </div>
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
