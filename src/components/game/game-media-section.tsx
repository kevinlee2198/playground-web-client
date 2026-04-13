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
  currentUserId: number | null;
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

  const [livestream] = useState(() =>
    initialMedia.reduce<LivestreamMediaNode | null>(
      (latest, edge) => {
        if (edge.node.__typename !== "LivestreamMedia") return latest;
        if (!latest) return edge.node;
        return edge.node.createdAt > latest.createdAt ? edge.node : latest;
      },
      null,
    ),
  );

  const [media, setMedia] = useState(() =>
    initialMedia.filter(
      (edge) => edge.node.__typename !== "LivestreamMedia",
    ),
  );
  const [pageInfo, setPageInfo] = useState(initialPageInfo);

  const [galleryFileInputClick, setGalleryFileInputClick] = useState<
    (() => void) | null
  >(null);

  const handleFileInputReady = useCallback((click: () => void) => {
    setGalleryFileInputClick(() => click);
  }, []);

  const handleMediaAdded = useCallback((node: GameMediaNode) => {
    setMedia((prev) => [{ cursor: node.id, node }, ...prev]);
  }, []);

  const handleMediaDeleted = useCallback((mediaId: string) => {
    setMedia((prev) => prev.filter((edge) => edge.node.id !== mediaId));
  }, []);

  const handleMediaLoaded = useCallback(
    (newEdges: Edge<GameMediaNode>[], newPageInfo: PageInfo) => {
      setMedia((prev) => [...prev, ...newEdges]);
      setPageInfo(newPageInfo);
    },
    [],
  );

  const isEmpty = media.length === 0 && !livestream;

  if (isEmpty && !canContribute) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TypographyH3>{t("title")}</TypographyH3>
        {media.length > 0 && (
          <Badge variant="secondary">{media.length}</Badge>
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
            {t("uploadMedia")}
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
        media={media}
        pageInfo={pageInfo}
        canContribute={canContribute}
        currentUserId={currentUserId}
        viewerGameRole={viewerGameRole}
        gameVisibility={gameVisibility}
        onFileInputReady={handleFileInputReady}
        onMediaAdded={handleMediaAdded}
        onMediaDeleted={handleMediaDeleted}
        onMediaLoaded={handleMediaLoaded}
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
