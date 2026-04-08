"use client";

import { Button } from "@/components/ui/button";
import type { GameVisibility } from "@/lib/constants";
import { isEmbeddable } from "@/lib/embed-config";
import type { GameMediaNode } from "@/lib/types/game-media";
import { Film, Link as LinkIcon, Play, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { EmbedPlayer } from "./embed-player";

const cardClass =
  "group relative aspect-square overflow-hidden rounded-xl border touch-manipulation motion-safe:hover:shadow-card-hover transition-shadow";

interface GameMediaItemProps {
  media: GameMediaNode;
  canDelete: boolean;
  gameVisibility: GameVisibility;
  onDelete: (mediaId: string) => void;
}

function DeleteButton({
  onDelete,
  mediaId,
  stopPropagation,
  ariaLabel,
}: {
  onDelete: (id: string) => void;
  mediaId: string;
  stopPropagation?: boolean;
  ariaLabel: string;
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
      aria-label={ariaLabel}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

function VideoMediaItem({
  media,
  canDelete,
  gameVisibility,
  onDelete,
}: GameMediaItemProps & {
  media: Extract<GameMediaNode, { __typename: "VideoMedia" | "LivestreamMedia" }>;
}) {
  const t = useTranslations("game.media");
  const [isPlaying, setIsPlaying] = useState(false);

  function renderPlayback() {
    if (!isPlaying) {
      return (
        <button
          onClick={() => setIsPlaying(true)}
          className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted"
          aria-label={t("playVideo", { title: media.title ?? media.source })}
        >
          {media.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- video thumbnail from third-party embed providers (YouTube, Vimeo, etc.); see embed-player.tsx for rationale
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
        <EmbedPlayer
          embedUrl={media.embedUrl}
          thumbnailUrl={media.thumbnailUrl}
          title={media.title}
          source={media.source}
          autoLoad={false}
          gameVisibility={gameVisibility}
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
    <div className={cardClass}>
      {renderPlayback()}

      {canDelete && !isPlaying && (
        <DeleteButton
          onDelete={onDelete}
          mediaId={media.id}
          stopPropagation
          ariaLabel={t("delete.title")}
        />
      )}
    </div>
  );
}

function LinkCardFallback({
  media,
  canDelete,
  onDelete,
}: {
  media: GameMediaNode;
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("game.media");

  return (
    <div className={cardClass}>
      <a
        href={media.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted p-4"
      >
        {media.thumbnailUrl ? (
          <div className="flex h-full w-full flex-col">
            {/* eslint-disable-next-line @next/next/no-img-element -- link preview thumbnail on arbitrary third-party hosts; cannot be pre-declared in images.remotePatterns */}
            <img
              src={media.thumbnailUrl}
              alt={media.title ?? t("opensInNewTab")}
              loading="lazy"
              className="flex-1 w-full object-cover"
            />
            <span className="p-2 text-xs text-muted-foreground truncate">
              {t("openInProvider", { provider: media.source })}
            </span>
          </div>
        ) : (
          <>
            <LinkIcon className="h-10 w-10 text-muted-foreground" />
            <span className="text-xs text-muted-foreground text-center line-clamp-2">
              {media.title ?? media.url}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("openInProvider", { provider: media.source })}
            </span>
          </>
        )}
      </a>

      {canDelete && (
        <DeleteButton onDelete={onDelete} mediaId={media.id} ariaLabel={t("delete.title")} />
      )}
    </div>
  );
}

export function GameMediaItem({
  media,
  canDelete,
  gameVisibility,
  onDelete,
}: GameMediaItemProps) {
  const t = useTranslations("game.media");

  if (
    media.__typename === "VideoMedia" ||
    media.__typename === "LivestreamMedia"
  ) {
    if (
      media.__typename === "VideoMedia" &&
      media.embedUrl &&
      !isEmbeddable(media.embedUrl)
    ) {
      return (
        <LinkCardFallback
          media={media}
          canDelete={canDelete}
          onDelete={onDelete}
        />
      );
    }
    return (
      <VideoMediaItem
        media={media}
        canDelete={canDelete}
        gameVisibility={gameVisibility}
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
            // eslint-disable-next-line @next/next/no-img-element -- link media thumbnail on arbitrary third-party hosts; cannot be pre-declared in images.remotePatterns
            <img
              src={media.thumbnailUrl}
              alt={media.title ?? t("opensInNewTab")}
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

        {canDelete && (
          <DeleteButton onDelete={onDelete} mediaId={media.id} ariaLabel={t("delete.title")} />
        )}
      </div>
    );
  }

  const thumbnailSrc = media.thumbnailUrl ?? media.url;

  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border touch-manipulation motion-safe:hover:shadow-card-hover transition-shadow">
      <a
        href={media.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full w-full"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- image media hosted on the backend file server; converting to next/image requires adding images.remotePatterns in next.config and tracking intrinsic dimensions from uploads */}
        <img
          src={thumbnailSrc}
          alt={media.title ?? t("title")}
          loading="lazy"
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </a>

      {canDelete && (
        <DeleteButton onDelete={onDelete} mediaId={media.id} ariaLabel={t("delete.title")} />
      )}
    </div>
  );
}
