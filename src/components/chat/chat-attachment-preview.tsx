"use client";

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { formatFileSize } from "@/lib/upload-validation";
import { Film, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface ChatAttachmentPreviewProps {
  file: File;
  previewUrl: string | null;
  error: string | null;
  onRemove: () => void;
  disabled?: boolean;
}

export function ChatAttachmentPreview({
  file,
  previewUrl,
  error,
  onRemove,
  disabled,
}: ChatAttachmentPreviewProps) {
  const t = useTranslations("chat.media");
  const isImage = file.type.startsWith("image/");
  const showImagePreview = isImage && previewUrl;

  return (
    <Attachment state={error ? "error" : "idle"}>
      <AttachmentMedia variant={showImagePreview ? "image" : "icon"}>
        {showImagePreview ? (
          // eslint-disable-next-line @next/next/no-img-element -- previewUrl is a blob: URL for an unsaved local file, which next/image cannot handle
          <img
            src={previewUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <Film />
        )}
      </AttachmentMedia>

      <AttachmentContent>
        <AttachmentTitle>{file.name}</AttachmentTitle>
        <AttachmentDescription>
          {formatFileSize(file.size)}
        </AttachmentDescription>
        {error && (
          <AttachmentDescription className="text-destructive">
            {error}
          </AttachmentDescription>
        )}
      </AttachmentContent>

      <AttachmentActions>
        <AttachmentAction
          className="size-11"
          onClick={onRemove}
          disabled={disabled}
          aria-label={t("removeAttachment")}
        >
          <X />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  );
}
