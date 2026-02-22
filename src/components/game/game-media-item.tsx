"use client";

import { Button } from "@/components/ui/button";
import type { Resource } from "@/lib/types/resource";
import { isVideoMimeType } from "@/lib/upload-validation";
import { Film, Play, Trash2 } from "lucide-react";
import { useState } from "react";

interface GameMediaItemProps {
  resource: Resource;
  isParticipant: boolean;
  onDelete: (resourceId: string) => void;
}

export function GameMediaItem({
  resource,
  isParticipant,
  onDelete,
}: GameMediaItemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const isVideo = isVideoMimeType(resource.mimeType);

  if (isVideo) {
    return (
      <div className="group relative aspect-square overflow-hidden rounded-lg border touch-manipulation">
        {isPlaying ? (
          <video
            controls
            autoPlay
            preload="metadata"
            className="h-full w-full object-contain"
            src={resource.downloadUrl}
            onEnded={() => setIsPlaying(false)}
          >
            Your browser does not support the video element.
          </video>
        ) : (
          <button
            onClick={() => setIsPlaying(true)}
            className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted"
            aria-label="Play video"
          >
            <Film className="h-10 w-10 text-muted-foreground" />
            <Play className="h-6 w-6 text-muted-foreground" />
          </button>
        )}

        {isParticipant && !isPlaying && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(resource.id);
            }}
            aria-label="Delete media"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // Image resource
  const thumbnailSrc =
    resource.__typename === "ImageResource"
      ? (resource.thumbnailUrl ?? resource.downloadUrl)
      : resource.downloadUrl;

  const imgWidth =
    resource.__typename === "ImageResource" && resource.width
      ? resource.width
      : undefined;
  const imgHeight =
    resource.__typename === "ImageResource" && resource.height
      ? resource.height
      : undefined;

  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg border touch-manipulation">
      <a
        href={resource.downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full w-full"
      >
        <img
          src={thumbnailSrc}
          alt={resource.filename}
          width={imgWidth}
          height={imgHeight}
          loading="lazy"
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </a>

      {isParticipant && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
          onClick={() => onDelete(resource.id)}
          aria-label="Delete media"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
