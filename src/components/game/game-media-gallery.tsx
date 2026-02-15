"use client";

import { loadGameMedia } from "@/app/[locale]/game/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import type { Resource } from "@/lib/types/resource";
import { Download, FileIcon, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface GameMediaGalleryProps {
  gameId: number;
  initialMedia: Edge<Resource>[];
  initialPageInfo: PageInfo;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function GameMediaGallery({
  gameId,
  initialMedia,
  initialPageInfo,
}: GameMediaGalleryProps) {
  const t = useTranslations("game");
  const [media, setMedia] = useState(initialMedia);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [isLoading, setIsLoading] = useState(false);

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

  if (media.length === 0) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{t("media.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {media.map((edge) => {
            const resource = edge.node;

            if (resource.__typename === "ImageResource") {
              return (
                <a
                  key={resource.id}
                  href={resource.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-lg border"
                >
                  <img
                    src={resource.thumbnailUrl ?? resource.downloadUrl}
                    alt={resource.filename}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </a>
              );
            }

            return (
              <a
                key={resource.id}
                href={resource.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-2 rounded-lg border p-4 transition-colors hover:bg-accent/50"
              >
                <FileIcon className="h-8 w-8 text-muted-foreground" />
                <span className="max-w-full truncate text-xs font-medium">
                  {resource.filename}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(resource.size)}
                </span>
                <Download className="h-4 w-4 text-muted-foreground" />
              </a>
            );
          })}
        </div>

        {pageInfo.hasNextPage && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("media.loadMore")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
