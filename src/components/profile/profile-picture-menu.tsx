"use client";

import { Camera, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProfilePictureMenuProps {
  hasProfilePicture: boolean;
  onUpload: () => void;
  onRemove: () => void;
}

export function ProfilePictureMenu({
  hasProfilePicture,
  onUpload,
  onRemove,
}: ProfilePictureMenuProps) {
  const t = useTranslations("profile.picture");

  return (
    <>
      {/* Camera overlay — directly opens file picker */}
      <button
        type="button"
        className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
        aria-label={t("upload")}
        onClick={onUpload}
      >
        <Camera className="h-8 w-8 text-white" />
      </button>

      {/* Remove button — small X in top-right corner */}
      {hasProfilePicture && (
        <button
          type="button"
          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
          aria-label={t("remove")}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </>
  );
}
