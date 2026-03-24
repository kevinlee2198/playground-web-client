"use client";

import { Button } from "@/components/ui/button";
import type { GameMediaNode } from "@/lib/types/game-media";
import { Film, Link as LinkIcon, Play, Trash2 } from "lucide-react";
import { useState } from "react";

interface GameMediaItemProps {
  media: GameMediaNode;
  isParticipant: boolean;
  onDelete: (mediaId: string) => void;
}

function DeleteButton({
  onDelete,
  mediaId,
  stopPropagation,
}: {
  onDelete: (id: string) => void;
  mediaId: string;
  stopPropagation?: boolean;
}) {
  return (
    <Button
      variant="destructive"
      size="icon"
      className="absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        onDelete(mediaId);
      }}
      aria-label="Delete media"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

function VideoMediaItem({
  media,
  isParticipant,
  onDelete,
}: GameMediaItemProps & {
  media: Extract<GameMediaNode, { __typename: "VideoMedia" | "LivestreamMedia" }>;
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  function renderPlayback() {
    if (!isPlaying) {
      return (
        <button
          onClick={() => setIsPlaying(true)}
          className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted"
          aria-label="Play video"
        >
          {media.thumbnailUrl ? (
            <img
              src={media.thumbnailUrl}
              alt={media.title ?? "Video thumbnail"}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <>
              <Film className="h-10 w-10 text-muted-foreground" />
              <Play className="h-6 w-6 text-muted-foreground" />
            </>
          )}
        </button>
      );
    }

    if (media.embedUrl) {
      return (
        <iframe
          src={media.embedUrl}
          title={media.title ?? "Video"}
          className="h-full w-full"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      );
    }

    return (
      <video
        controls
        autoPlay
        preload="metadata"
        className="h-full w-full object-contain"
        src={media.url}
        onEnded={() => setIsPlaying(false)}
      >
        Your browser does not support the video element.
      </video>
    );
  }

  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border touch-manipulation motion-safe:hover:shadow-card-hover transition-shadow">
      {renderPlayback()}

      {isParticipant && !isPlaying && (
        <DeleteButton
          onDelete={onDelete}
          mediaId={media.id}
          stopPropagation
        />
      )}
    </div>
  );
}

export function GameMediaItem({
  media,
  isParticipant,
  onDelete,
}: GameMediaItemProps) {
  if (
    media.__typename === "VideoMedia" ||
    media.__typename === "LivestreamMedia"
  ) {
    return (
      <VideoMediaItem
        media={media}
        isParticipant={isParticipant}
        onDelete={onDelete}
      />
    );
  }

  if (media.__typename === "LinkMedia") {
    return (
      <div className="group relative aspect-square overflow-hidden rounded-xl border touch-manipulation motion-safe:hover:shadow-card-hover transition-shadow">
        <a
          href={media.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted p-4"
        >
          {media.thumbnailUrl ? (
            <img
              src={media.thumbnailUrl}
              alt={media.title ?? "Link preview"}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <>
              <LinkIcon className="h-10 w-10 text-muted-foreground" />
              <span className="text-xs text-muted-foreground text-center line-clamp-2">
                {media.title ?? media.url}
              </span>
            </>
          )}
        </a>

        {isParticipant && (
          <DeleteButton onDelete={onDelete} mediaId={media.id} />
        )}
      </div>
    );
  }

  // ImageMedia
  const thumbnailSrc = media.thumbnailUrl ?? media.url;

  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border touch-manipulation motion-safe:hover:shadow-card-hover transition-shadow">
      <a
        href={media.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full w-full"
      >
        <img
          src={thumbnailSrc}
          alt={media.title ?? "Game media"}
          loading="lazy"
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </a>

      {isParticipant && (
        <DeleteButton onDelete={onDelete} mediaId={media.id} />
      )}
    </div>
  );
}
