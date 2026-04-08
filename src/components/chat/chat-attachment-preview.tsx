"use client";

import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/upload-validation";
import { Film, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface ChatAttachmentPreviewProps {
  file: File;
  previewUrl: string | null;
  error: string | null;
  onRemove: () => void;
}

export function ChatAttachmentPreview({
  file,
  previewUrl,
  error,
  onRemove,
}: ChatAttachmentPreviewProps) {
  const t = useTranslations("chat.media");
  const isImage = file.type.startsWith("image/");

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border">
        {isImage && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- previewUrl is a blob: URL for an unsaved local file, which next/image cannot handle
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Film className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{file.name}</div>
        <div className="text-xs text-muted-foreground">
          {formatFileSize(file.size)}
        </div>
        {error && <div className="text-xs text-destructive">{error}</div>}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onRemove}
        aria-label={t("removeAttachment")}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
