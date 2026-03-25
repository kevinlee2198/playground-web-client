"use client";

import { cn } from "@/lib/utils";
import type { MediaSource } from "@/lib/types/game-media";
import { GameVisibility } from "@/lib/constants";
import { Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

interface EmbedPlayerProps {
  embedUrl: string;
  thumbnailUrl: string | null;
  title: string | null;
  source: MediaSource;
  autoLoad: boolean;
  gameVisibility: GameVisibility;
}

export function EmbedPlayer({
  embedUrl,
  thumbnailUrl,
  title,
  source,
  autoLoad,
  gameVisibility,
}: EmbedPlayerProps) {
  const t = useTranslations("game.media");
  const [isPlaying, setIsPlaying] = useState(autoLoad);
  const disclosureId = useId();

  const isTikTok = source === "TIKTOK";
  const showDisclosure = gameVisibility !== GameVisibility.PUBLIC;
  const aspectClass = isTikTok ? "aspect-[9/16] max-w-sm mx-auto" : "aspect-video";

  if (isPlaying) {
    return (
      <div className={cn("w-full overflow-hidden rounded-lg", aspectClass)}>
        <iframe
          src={embedUrl}
          title={title ?? `${source} video`}
          className="h-full w-full transition-opacity motion-safe:duration-300"
          sandbox="allow-scripts allow-same-origin allow-popups"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          loading={autoLoad ? "eager" : "lazy"}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className={cn("relative overflow-hidden rounded-lg bg-muted", aspectClass)}>
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title ?? source}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={() => setIsPlaying(true)}
            aria-label={t("playVideo", { title: title ?? source })}
            aria-describedby={showDisclosure ? disclosureId : undefined}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white transition-opacity motion-safe:duration-300 hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Play className="h-7 w-7 fill-white" />
          </button>
        </div>
      </div>
      {showDisclosure && (
        <p id={disclosureId} className="mt-1 text-xs text-muted-foreground">
          {t("privacyDisclosure", { provider: source })}
        </p>
      )}
    </div>
  );
}
