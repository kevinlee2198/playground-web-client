"use client";

import {
  confirmUpload,
  deleteResource,
  requestProfilePictureUpload,
} from "@/app/[locale]/upload/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadToS3 } from "@/lib/s3-upload";
import type { Resource } from "@/lib/types/resource";
import { getAcceptAttribute, validateFile } from "@/lib/upload-validation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ProfilePictureMenu } from "./profile-picture-menu";
import { ProfilePicturePreviewDialog } from "./profile-picture-preview-dialog";
import { RemovePictureDialog } from "./remove-picture-dialog";

interface ProfileAvatarProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    profilePicture: Resource | null;
  };
}

export function ProfileAvatar({ user }: ProfileAvatarProps) {
  const t = useTranslations("profile.picture");

  const [profilePicture, setProfilePicture] = useState<Resource | null>(
    user.profilePicture,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke old preview URL when it changes
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const initials =
    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  const profilePictureUrl =
    profilePicture?.__typename === "ImageResource"
      ? (profilePicture.thumbnailUrl ?? profilePicture.downloadUrl)
      : profilePicture?.downloadUrl;

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset file input so the same file can be re-selected
      e.target.value = "";

      const validation = validateFile(file, "profilePicture");
      if (!validation.valid) {
        if (validation.error === "invalidType") {
          toast.error(t("errors.invalidType"));
        } else if (validation.error === "fileTooLarge") {
          toast.error(t("errors.fileTooLarge"));
        }
        return;
      }

      // Revoke old preview URL before creating new one
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      const url = URL.createObjectURL(file);
      setSelectedFile(file);
      setPreviewUrl(url);
      setShowPreview(true);
    },
    [previewUrl, t],
  );

  const handleUploadConfirm = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    try {
      // 1. Request upload
      const requestResult = await requestProfilePictureUpload(
        selectedFile.name,
        selectedFile.type,
        selectedFile.size,
      );
      if (!requestResult.success || !requestResult.resourceId) {
        toast.error(requestResult.error || t("errors.uploadFailed"));
        return;
      }

      // 2. Upload to S3 (skip if uploadUrl is null for LOCAL storage dev environments)
      if (requestResult.uploadUrl) {
        const s3Result = await uploadToS3(
          selectedFile,
          requestResult.uploadUrl,
        );
        if (!s3Result.success) {
          toast.error(t("errors.uploadFailed"));
          return;
        }
      }

      // 3. Confirm upload
      const confirmResult = await confirmUpload(requestResult.resourceId);
      if (!confirmResult.success || !confirmResult.resource) {
        toast.error(t("errors.saveFailed"));
        return;
      }

      // 4. Delete old profile picture (fire-and-forget)
      const oldResource = profilePicture;
      if (oldResource) {
        deleteResource(oldResource.id).then((result) => {
          if (!result.success) {
            console.warn("Failed to delete old profile picture:", result.error);
          }
        });
      }

      // 5. Update local state
      setProfilePicture(confirmResult.resource);
      toast.success(t("success"));
      setShowPreview(false);
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!profilePicture || isRemoving) return;

    setIsRemoving(true);
    try {
      const result = await deleteResource(profilePicture.id);
      if (!result.success) {
        toast.error(result.error || t("errors.removeFailed"));
        return;
      }

      setProfilePicture(null);
      toast.success(t("removed"));
      setShowRemoveDialog(false);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <div className="group relative">
        <Avatar className="h-24 w-24 text-2xl sm:h-32 sm:w-32">
          <AvatarImage
            src={profilePictureUrl ?? undefined}
            alt={user.displayName}
          />
          <AvatarFallback className="text-2xl font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        <ProfilePictureMenu
          hasProfilePicture={profilePicture !== null}
          onUpload={() => fileInputRef.current?.click()}
          onRemove={() => setShowRemoveDialog(true)}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptAttribute("profilePicture")}
        onChange={handleFileSelect}
        className="hidden"
      />

      {selectedFile && previewUrl && (
        <ProfilePicturePreviewDialog
          open={showPreview}
          onOpenChange={(open) => {
            setShowPreview(open);
            if (!open) {
              setSelectedFile(null);
              if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }
            }
          }}
          previewUrl={previewUrl}
          onConfirm={handleUploadConfirm}
          isUploading={isUploading}
        />
      )}

      <RemovePictureDialog
        open={showRemoveDialog}
        onOpenChange={setShowRemoveDialog}
        onConfirm={handleRemoveConfirm}
        isRemoving={isRemoving}
      />
    </>
  );
}
