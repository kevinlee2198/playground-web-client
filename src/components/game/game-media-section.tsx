"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TypographyH3 } from "@/components/ui/typography";
import type { GameRole, GameVisibility } from "@/lib/constants";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import type { GameMediaNode, LivestreamMediaNode } from "@/lib/types/game-media";
import { Link as LinkIcon, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { AddLinkDialog } from "./add-link-dialog";
import { GameMediaGallery } from "./game-media-gallery";
import { LiveStreamSection } from "./live-stream-section";

interface GameMediaSectionProps {
  gameId: number;
  initialMedia: Edge<GameMediaNode>[];
  initialPageInfo: PageInfo;
  canContribute: boolean;
  currentUserId: string | null;
  viewerGameRole: GameRole | null;
  gameVisibility: GameVisibility;
}

export function GameMediaSection({
  gameId,
  initialMedia,
  initialPageInfo,
  canContribute,
  currentUserId,
  viewerGameRole,
  gameVisibility,
}: GameMediaSectionProps) {
  const t = useTranslations("game.media");
  const [addLinkOpen, setAddLinkOpen] = useState(false);

  const livestream = initialMedia.reduce<LivestreamMediaNode | null>(
    (latest, edge) => {
      if (edge.node.__typename !== "LivestreamMedia") return latest;
      if (!latest) return edge.node;
      return edge.node.createdAt > latest.createdAt ? edge.node : latest;
    },
    null,
  );

  const gridMedia = initialMedia.filter(
    (edge) => edge.node.__typename !== "LivestreamMedia",
  );

  const [galleryFileInputClick, setGalleryFileInputClick] = useState<
    (() => void) | null
  >(null);

  const handleFileInputReady = useCallback((click: () => void) => {
    setGalleryFileInputClick(() => click);
  }, []);

  const [externalMedia, setExternalMedia] = useState<Edge<GameMediaNode>[]>([]);

  const handleMediaAdded = useCallback((media: GameMediaNode) => {
    setExternalMedia((prev) => [{ cursor: media.id, node: media }, ...prev]);
  }, []);

  const totalGridCount = gridMedia.length + externalMedia.length;
  const isEmpty = totalGridCount === 0 && !livestream;

  if (isEmpty && !canContribute) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TypographyH3>{t("title")}</TypographyH3>
        {totalGridCount > 0 && (
          <Badge variant="secondary">{totalGridCount}</Badge>
        )}
      </div>

      {livestream && (
        <div role="status" aria-live="polite">
          <LiveStreamSection
            media={livestream}
            gameVisibility={gameVisibility}
          />
        </div>
      )}

      {canContribute && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => galleryFileInputClick?.()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t("uploadPhoto")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddLinkOpen(true)}
          >
            <LinkIcon className="mr-2 h-4 w-4" />
            {t("addLink")}
          </Button>
        </div>
      )}

      <GameMediaGallery
        gameId={gameId}
        initialMedia={gridMedia}
        initialPageInfo={initialPageInfo}
        canUpload={canContribute}
        currentUserId={currentUserId}
        viewerGameRole={viewerGameRole}
        gameVisibility={gameVisibility}
        externalMedia={externalMedia}
        onFileInputReady={handleFileInputReady}
      />

      {canContribute && (
        <AddLinkDialog
          gameId={gameId}
          open={addLinkOpen}
          onOpenChange={setAddLinkOpen}
          onMediaAdded={handleMediaAdded}
        />
      )}
    </div>
  );
}
