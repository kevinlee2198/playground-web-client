"use client";

import { loadGameMedia } from "@/app/[locale]/game/actions";
import { deleteGameMedia } from "@/app/[locale]/game/media-actions";
import {
  confirmGameMediaUpload,
  requestGameMediaUpload,
} from "@/app/[locale]/upload/actions";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { GameRole, type GameVisibility } from "@/lib/constants";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import { uploadToS3 } from "@/lib/s3-upload";
import type { GameMediaNode } from "@/lib/types/game-media";
import {
  getAcceptAttribute,
  getMaxSizeLabel,
  validateFile,
} from "@/lib/upload-validation";
import { cn } from "@/lib/utils";
import { Camera, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import { DeleteMediaDialog } from "./delete-media-dialog";
import { GameMediaItem } from "./game-media-item";
import { GameMediaUploadPlaceholder } from "./game-media-upload-placeholder";

interface GameMediaGalleryProps {
  gameId: number;
  media: Edge<GameMediaNode>[];
  pageInfo: PageInfo;
  canContribute: boolean;
  currentUserId: number | null;
  viewerGameRole: GameRole | null;
  gameVisibility: GameVisibility;
  onFileInputReady?: (click: () => void) => void;
  onMediaAdded: (node: GameMediaNode) => void;
  onMediaDeleted: (mediaId: string) => void;
  onMediaLoaded: (
    newEdges: Edge<GameMediaNode>[],
    newPageInfo: PageInfo,
  ) => void;
}

interface UploadingFile {
  file: File;
  status: "uploading" | "error";
}

export function GameMediaGallery({
  gameId,
  media,
  pageInfo,
  canContribute,
  currentUserId,
  viewerGameRole,
  gameVisibility,
  onFileInputReady,
  onMediaAdded,
  onMediaDeleted,
  onMediaLoaded,
}: GameMediaGalleryProps) {
  const t = useTranslations("game.media");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<
    Map<string, UploadingFile>
  >(new Map());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (onFileInputReady && fileInputRef.current) {
      onFileInputReady(() => fileInputRef.current?.click());
    }
  }, [onFileInputReady]);

  const isLoadingRef = useRef(false);

  async function handleLoadMore(): Promise<void> {
    if (!pageInfo.hasNextPage || isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoading(true);

    const result = await loadGameMedia(
      gameId,
      12,
      pageInfo.endCursor ?? undefined,
    );

    if (result) {
      onMediaLoaded(result.edges, result.pageInfo);
    }

    isLoadingRef.current = false;
    setIsLoading(false);
  }

  function markUploadError(fileId: string, file: File): void {
    setUploadingFiles((prev) => {
      const next = new Map(prev);
      next.set(fileId, { file, status: "error" });
      return next;
    });
  }

  const uploadSingleFile = useCallback(
    async (file: File, fileId: string) => {
      try {
        const requestResult = await requestGameMediaUpload(
          file.name,
          file.type,
          file.size,
          gameId,
        );
        if (!requestResult.success || !requestResult.resourceId) {
          toast.add({
            title:
              requestResult.message ||
              t("errors.uploadFailed", { filename: file.name }),
            type: "error",
          });
          markUploadError(fileId, file);
          return;
        }

        if (requestResult.uploadUrl) {
          const s3Result = await uploadToS3(file, requestResult.uploadUrl);
          if (!s3Result.success) {
            toast.add({ title: t("errors.uploadFailed", { filename: file.name }), type: "error" });
            markUploadError(fileId, file);
            return;
          }
        }

        const confirmResult = await confirmGameMediaUpload(requestResult.resourceId);
        if (!confirmResult.success) {
          toast.add({ title: t("errors.saveFailed", { filename: file.name }), type: "error" });
          markUploadError(fileId, file);
          return;
        }

        const gameMedia = confirmResult.gameMedia;
        setUploadingFiles((prev) => {
          const next = new Map(prev);
          next.delete(fileId);
          return next;
        });
        onMediaAdded(gameMedia);
        toast.add({ title: t("success"), type: "success" });
      } catch {
        markUploadError(fileId, file);
        toast.add({ title: t("errors.uploadFailed", { filename: file.name }), type: "error" });
      }
    },
    [gameId, t, onMediaAdded],
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
            toast.add({ title: t("errors.invalidType"), type: "error" });
          } else if (validation.error === "fileTooLarge") {
            toast.add({
              title: t("errors.fileTooLarge", {
                limit: getMaxSizeLabel(file.type),
              }),
              type: "error",
            });
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

  function handleDeleteClick(mediaId: string): void {
    setMediaToDelete(mediaId);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm(): Promise<void> {
    if (!mediaToDelete) return;

    setIsDeleting(true);
    const result = await deleteGameMedia(mediaToDelete);

    if (!result.success) {
      const msg =
        result.errorType === "GameMediaNotFoundError"
          ? t("errors.deleteFailed")
          : result.message || t("delete.noPermission");
      toast.add({ title: msg, type: "error" });
      setIsDeleting(false);
      return;
    }

    onMediaDeleted(mediaToDelete);
    toast.add({ title: t("deleted"), type: "success" });
    setDeleteDialogOpen(false);
    setMediaToDelete(null);
    setIsDeleting(false);
  }

  function dismissUploadError(fileId: string): void {
    setUploadingFiles((prev) => {
      const next = new Map(prev);
      next.delete(fileId);
      return next;
    });
  }

  function canDeleteMedia(mediaNode: GameMediaNode): boolean {
    if (viewerGameRole === GameRole.OWNER || viewerGameRole === GameRole.EDITOR) {
      return true;
    }
    return currentUserId != null && mediaNode.addedBy.id === currentUserId;
  }

  const isEmpty = media.length === 0 && uploadingFiles.size === 0;

  if (isEmpty && !canContribute) {
    return null;
  }

  if (isEmpty) {
    return (
      <>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Camera />
            </EmptyMedia>
            <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
            <EmptyDescription>{t("emptyUploadPrompt")}</EmptyDescription>
          </EmptyHeader>
        </Empty>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={getAcceptAttribute("gameMedia")}
          onChange={handleFilesSelected}
          className="hidden"
          aria-label={t("uploadMedia")}
        />
      </>
    );
  }

  const uploadButton = (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      aria-label={t("uploadMedia")}
      className={cn(
        "aspect-square flex flex-col items-center justify-center gap-2",
        "border-2 border-dashed border-muted-foreground/25 rounded-xl",
        "text-muted-foreground transition-colors",
        "hover:border-muted-foreground/50 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "motion-safe:hover:shadow-card-hover",
      )}
    >
      <Camera className="h-8 w-8" />
      <span className="text-xs font-medium">{t("uploadMedia")}</span>
    </button>
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {media.map((edge) => (
          <GameMediaItem
            key={edge.node.id}
            media={edge.node}
            canDelete={canDeleteMedia(edge.node)}
            gameVisibility={gameVisibility}
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
        {canContribute && uploadButton}
      </div>

      {pageInfo.hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoading}
          >
            {isLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
            )}
            {t("loadMore")}
          </Button>
        </div>
      )}

      {canContribute && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={getAcceptAttribute("gameMedia")}
          onChange={handleFilesSelected}
          className="hidden"
          aria-label={t("uploadMedia")}
        />
      )}

      <DeleteMediaDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </>
  );
}
