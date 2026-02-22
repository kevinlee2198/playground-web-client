"use client";

import { loadGameMedia } from "@/app/[locale]/game/actions";
import {
  confirmUpload,
  deleteResource,
  requestGameMediaUpload,
} from "@/app/[locale]/upload/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import { uploadToS3 } from "@/lib/s3-upload";
import type { Resource } from "@/lib/types/resource";
import {
  getAcceptAttribute,
  getMaxSizeLabel,
  validateFile,
} from "@/lib/upload-validation";
import { ImageIcon, Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { DeleteMediaDialog } from "./delete-media-dialog";
import { GameMediaItem } from "./game-media-item";
import { GameMediaUploadPlaceholder } from "./game-media-upload-placeholder";

interface GameMediaGalleryProps {
  gameId: number;
  initialMedia: Edge<Resource>[];
  initialPageInfo: PageInfo;
  canUpload: boolean;
  isParticipant: boolean;
}

interface UploadingFile {
  file: File;
  status: "uploading" | "error";
}

export function GameMediaGallery({
  gameId,
  initialMedia,
  initialPageInfo,
  canUpload,
  isParticipant,
}: GameMediaGalleryProps) {
  const t = useTranslations("game");
  const [media, setMedia] = useState(initialMedia);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<
    Map<string, UploadingFile>
  >(new Map());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadMore = async () => {
    if (!pageInfo.hasNextPage || isLoading) return;
    setIsLoading(true);

    const result = await loadGameMedia(
      gameId,
      12,
      pageInfo.endCursor ?? undefined,
    );

    if (result) {
      setMedia((prev) => [...prev, ...result.edges]);
      setPageInfo(result.pageInfo);
    }

    setIsLoading(false);
  };

  const uploadSingleFile = useCallback(
    async (file: File, fileId: string) => {
      try {
        // 1. Request upload
        const requestResult = await requestGameMediaUpload(
          file.name,
          file.type,
          file.size,
          gameId,
        );
        if (!requestResult.success || !requestResult.resourceId) {
          toast.error(
            requestResult.error ||
              t("media.errors.uploadFailed", { filename: file.name }),
          );
          setUploadingFiles((prev) => {
            const next = new Map(prev);
            next.set(fileId, { file, status: "error" });
            return next;
          });
          return;
        }

        // 2. Upload to S3 (skip if uploadUrl is null for LOCAL storage)
        if (requestResult.uploadUrl) {
          const s3Result = await uploadToS3(file, requestResult.uploadUrl);
          if (!s3Result.success) {
            toast.error(
              t("media.errors.uploadFailed", { filename: file.name }),
            );
            setUploadingFiles((prev) => {
              const next = new Map(prev);
              next.set(fileId, { file, status: "error" });
              return next;
            });
            return;
          }
        }

        // 3. Confirm upload
        const confirmResult = await confirmUpload(requestResult.resourceId);
        if (!confirmResult.success || !confirmResult.resource) {
          toast.error(t("media.errors.saveFailed", { filename: file.name }));
          setUploadingFiles((prev) => {
            const next = new Map(prev);
            next.set(fileId, { file, status: "error" });
            return next;
          });
          return;
        }

        // 4. Success: remove placeholder, add to media
        const resource = confirmResult.resource;
        setUploadingFiles((prev) => {
          const next = new Map(prev);
          next.delete(fileId);
          return next;
        });
        setMedia((prev) => [...prev, { cursor: resource.id, node: resource }]);
        toast.success(t("media.success"));
      } catch {
        setUploadingFiles((prev) => {
          const next = new Map(prev);
          next.set(fileId, { file, status: "error" });
          return next;
        });
        toast.error(t("media.errors.uploadFailed", { filename: file.name }));
      }
    },
    [gameId, t],
  );

  const handleFilesSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      // Reset file input
      e.target.value = "";

      const validFiles: { file: File; fileId: string }[] = [];

      for (const file of Array.from(files)) {
        const validation = validateFile(file, "gameMedia");
        if (!validation.valid) {
          if (validation.error === "invalidType") {
            toast.error(t("media.errors.invalidType"));
          } else if (validation.error === "fileTooLarge") {
            toast.error(
              t("media.errors.fileTooLarge", {
                limit: getMaxSizeLabel(file.type),
              }),
            );
          }
          continue;
        }

        const fileId = crypto.randomUUID();
        validFiles.push({ file, fileId });
      }

      if (validFiles.length === 0) return;

      // Add placeholders for all valid files
      setUploadingFiles((prev) => {
        const next = new Map(prev);
        for (const { file, fileId } of validFiles) {
          next.set(fileId, { file, status: "uploading" });
        }
        return next;
      });

      // Upload all files concurrently
      Promise.allSettled(
        validFiles.map(({ file, fileId }) => uploadSingleFile(file, fileId)),
      );
    },
    [t, uploadSingleFile],
  );

  const handleDeleteClick = (resourceId: string) => {
    setResourceToDelete(resourceId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!resourceToDelete) return;

    setIsDeleting(true);
    const result = await deleteResource(resourceToDelete);

    if (!result.success) {
      toast.error(result.error || t("media.errors.deleteFailed"));
      setIsDeleting(false);
      return;
    }

    setMedia((prev) =>
      prev.filter((edge) => edge.node.id !== resourceToDelete),
    );
    toast.success(t("media.deleted"));
    setDeleteDialogOpen(false);
    setResourceToDelete(null);
    setIsDeleting(false);
  };

  const dismissUploadError = (fileId: string) => {
    setUploadingFiles((prev) => {
      const next = new Map(prev);
      next.delete(fileId);
      return next;
    });
  };

  const isEmpty = media.length === 0 && uploadingFiles.size === 0;

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("media.title")}</CardTitle>
        {canUpload && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("media.upload")}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ImageIcon />
              </EmptyMedia>
              <EmptyDescription>
                {canUpload ? t("media.emptyParticipant") : t("media.empty")}
              </EmptyDescription>
            </EmptyHeader>
            {canUpload && (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("media.upload")}
              </Button>
            )}
          </Empty>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {media.map((edge) => (
                <GameMediaItem
                  key={edge.node.id}
                  resource={edge.node}
                  isParticipant={isParticipant}
                  onDelete={handleDeleteClick}
                />
              ))}
              {Array.from(uploadingFiles).map(([fileId, uploadFile]) => (
                <GameMediaUploadPlaceholder
                  key={fileId}
                  filename={uploadFile.file.name}
                  status={uploadFile.status}
                  onDismiss={
                    uploadFile.status === "error"
                      ? () => dismissUploadError(fileId)
                      : undefined
                  }
                />
              ))}
            </div>

            {pageInfo.hasNextPage && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t("media.loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>

      {canUpload && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={getAcceptAttribute("gameMedia")}
          onChange={handleFilesSelected}
          className="hidden"
        />
      )}

      <DeleteMediaDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </Card>
  );
}
