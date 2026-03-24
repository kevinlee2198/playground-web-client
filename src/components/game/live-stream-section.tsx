"use client";

import { Badge } from "@/components/ui/badge";
import { TypographyH4, TypographyMuted } from "@/components/ui/typography";
import { BreathingDot } from "@/components/game/breathing-dot";
import { EmbedPlayer } from "@/components/game/embed-player";
import type { GameVisibility } from "@/lib/constants";
import type { LivestreamMediaNode } from "@/lib/types/game-media";
import { useTranslations } from "next-intl";

interface LiveStreamSectionProps {
  media: LivestreamMediaNode;
  gameVisibility: GameVisibility;
}

export function LiveStreamSection({ media, gameVisibility }: LiveStreamSectionProps) {
  const t = useTranslations("game.media");

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="destructive">
          <BreathingDot />
          <span>
            <span className="sr-only">Currently </span>
            {t("live")}
          </span>
        </Badge>
      </div>
      {media.title && <TypographyH4>{media.title}</TypographyH4>}
      <EmbedPlayer
        embedUrl={media.embedUrl}
        thumbnailUrl={media.thumbnailUrl}
        title={media.title}
        source={media.source}
        autoLoad
        gameVisibility={gameVisibility}
      />
      <TypographyMuted>
        Added by @{media.addedBy.username}
      </TypographyMuted>
    </div>
  );
}
