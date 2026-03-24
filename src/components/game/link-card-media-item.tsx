"use client";

import { Button } from "@/components/ui/button";
import { TypographySmall } from "@/components/ui/typography";
import type { LinkMediaNode } from "@/lib/types/game-media";
import { Link as LinkIcon, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface LinkCardMediaItemProps {
  media: LinkMediaNode;
  canDelete: boolean;
  onDelete: (id: string) => void;
}

export function LinkCardMediaItem({
  media,
  canDelete,
  onDelete,
}: LinkCardMediaItemProps) {
  const t = useTranslations("game.media");

  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border touch-manipulation transition-shadow motion-safe:hover:shadow-card-hover">
      <a
        href={media.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full w-full flex-col"
      >
        {media.thumbnailUrl ? (
          <img
            src={media.thumbnailUrl}
            alt={media.title ?? "Link preview"}
            loading="lazy"
            className="h-24 w-full flex-shrink-0 object-cover"
          />
        ) : (
          <div className="flex h-24 w-full flex-shrink-0 items-center justify-center bg-muted">
            <LinkIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-1 overflow-hidden p-2">
          {media.title && (
            <TypographySmall className="block truncate">
              {media.title}
            </TypographySmall>
          )}
          {media.description && (
            <TypographySmall className="line-clamp-2 font-normal text-muted-foreground">
              {media.description}
            </TypographySmall>
          )}
        </div>
        <span className="sr-only">{t("opensInNewTab")}</span>
      </a>

      {canDelete && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
          onClick={() => onDelete(media.id)}
          aria-label={t("delete.title")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
