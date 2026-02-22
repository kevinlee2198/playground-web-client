"use client";

import { Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface GameMediaUploadPlaceholderProps {
  filename: string;
  status: "uploading" | "error";
  onDismiss?: () => void;
}

export function GameMediaUploadPlaceholder({
  filename,
  status,
  onDismiss,
}: GameMediaUploadPlaceholderProps) {
  const t = useTranslations("game.media");

  if (status === "error") {
    return (
      <div
        className="relative flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4"
        aria-live="polite"
      >
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute right-2 top-2 rounded-full p-1 hover:bg-destructive/20"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-destructive" />
          </button>
        )}
        <span className="max-w-full truncate text-xs font-medium text-destructive">
          {filename}
        </span>
        <span className="text-xs text-destructive">
          {t("errors.uploadFailed", { filename })}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border bg-muted/50 p-4"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground motion-reduce:animate-none" />
      <span className="max-w-full truncate text-xs text-muted-foreground">
        {t("uploading")}
      </span>
    </div>
  );
}
