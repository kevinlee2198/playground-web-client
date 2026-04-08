"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProfilePicturePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewUrl: string;
  onConfirm: () => void;
  isUploading: boolean;
}

export function ProfilePicturePreviewDialog({
  open,
  onOpenChange,
  previewUrl,
  onConfirm,
  isUploading,
}: ProfilePicturePreviewDialogProps) {
  const t = useTranslations("profile.picture");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("preview.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center py-4">
          {/* TODO: Add image cropping support here */}
          {/* eslint-disable-next-line @next/next/no-img-element -- previewUrl is a blob: URL for a local file chosen via <input type="file">, which next/image cannot handle */}
          <img
            src={previewUrl}
            alt=""
            className="h-48 w-48 rounded-full object-cover"
          />
        </div>

        <div aria-live="polite" className="text-center text-sm text-muted-foreground">
          {isUploading && t("uploading")}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            {t("preview.cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={isUploading}>
            {isUploading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
            )}
            {t("preview.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
