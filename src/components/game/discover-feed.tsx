"use client";

import { loadMoreGames } from "@/app/[locale]/game/actions";
import { DistancePresets } from "@/components/game/distance-presets";
import { GameCard } from "@/components/game/game-card";
import { LocationAutocomplete } from "@/components/location/location-autocomplete";
import { LocationIndicator } from "@/components/game/location-indicator";
import { Button } from "@/components/ui/button";
import { TypographyMuted, TypographyP } from "@/components/ui/typography";
import { useUserLocation } from "@/hooks/use-user-location";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { PageInfo } from "@/lib/graphql-connection";
import type { LocationValue } from "@/lib/types/location";
import type {
  GameEdgeWithDistance,
  GameFilterParams,
  GameSortParams,
} from "@/lib/types/game";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

interface DiscoverFeedProps {
  initialEdges: GameEdgeWithDistance[];
  initialPageInfo: PageInfo;
  initialFilters: GameFilterParams;
  initialSort: GameSortParams;
  locationName: string | null;
  hasLocation: boolean;
  distanceMiles: number;
  showDistancePresets?: boolean;
}

export function DiscoverFeed({
  initialEdges,
  initialPageInfo,
  initialFilters,
  initialSort,
  locationName,
  hasLocation,
  distanceMiles,
  showDistancePresets = false,
}: DiscoverFeedProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Run location detection waterfall if no location in URL
  const { completed: detectionCompleted } = useUserLocation({ skip: hasLocation });

  // Hydration-safe isDetecting: false during SSR + hydration, true only after mount.
  // useSyncExternalStore with a no-op subscribe returns true on the client and
  // false on the server/during hydration — the canonical React 18 hydration guard.
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isDetecting = isMounted && !hasLocation && !detectionCompleted;

  const [showLocationSearch, setShowLocationSearch] = useState(false);

  // --- Infinite scroll state ---
  const [edges, setEdges] = useState(initialEdges);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [isPending, startTransition] = useTransition();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Reset edges when SSR data changes (URL-driven filter/sort change)
  const [prevInitialEdges, setPrevInitialEdges] = useState(initialEdges);
  if (prevInitialEdges !== initialEdges) {
    setPrevInitialEdges(initialEdges);
    setEdges(initialEdges);
    setPageInfo(initialPageInfo);
  }

  const loadMore = useCallback(() => {
    if (!pageInfo.hasNextPage || isPending || !pageInfo.endCursor) return;

    startTransition(async () => {
      const result = await loadMoreGames(
        initialFilters,
        initialSort,
        pageInfo.endCursor!,
      );
      if (result?.edges && result?.pageInfo) {
        setEdges((prev) => [...prev, ...result.edges]);
        setPageInfo(result.pageInfo);
      }
    });
  }, [pageInfo, isPending, initialFilters, initialSort]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "100px" },
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  // --- URL param updaters ---

  function updateLocationInUrl(lat: number, lng: number, loc: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lat", lat.toFixed(4));
    params.set("lng", lng.toFixed(4));
    params.set("loc", loc);
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearLocationInUrl() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("lat");
    params.delete("lng");
    params.delete("loc");
    params.delete("radius");
    router.push(`${pathname}?${params.toString()}`);
  }

  function updateRadiusInUrl(miles: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("radius", String(miles));
    router.push(`${pathname}?${params.toString()}`);
  }

  // --- Location autocomplete handlers ---

  function handleLocationSelect(loc: LocationValue) {
    if (loc.coordinates) {
      updateLocationInUrl(
        loc.coordinates.latitude,
        loc.coordinates.longitude,
        loc.displayName,
      );
    }
    setShowLocationSearch(false);
  }

  function handleLocationClear() {
    clearLocationInUrl();
    setShowLocationSearch(false);
  }

  return (
    <div className="space-y-4">
      {/* Location indicator + distance presets */}
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        aria-live="polite"
      >
        <LocationIndicator
          locationName={locationName}
          isDetecting={isDetecting}
          onChangeClick={() => setShowLocationSearch((prev) => !prev)}
        />
        {showDistancePresets && hasLocation && (
          <DistancePresets
            selected={distanceMiles}
            onSelect={updateRadiusInUrl}
          />
        )}
      </div>

      {/* Location search overlay */}
      {showLocationSearch && (
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <LocationAutocomplete
            value={null}
            onSelect={handleLocationSelect}
            onClear={handleLocationClear}
          />
          {hasLocation && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLocationClear}
            >
              {t("game.discover.showAllGames")}
            </Button>
          )}
        </div>
      )}

      {/* Game grid or empty state */}
      {edges.length === 0 ? (
        <div className="py-12 text-center">
          <TypographyP className="text-lg font-semibold text-muted-foreground">
            {hasLocation
              ? t("game.discover.noGamesNear", { location: locationName ?? "" })
              : t("game.discover.noGamesEverywhere")}
          </TypographyP>
          <TypographyMuted className="mt-2">
            {hasLocation
              ? t("game.discover.noGamesNearDescription")
              : t("game.discover.noGamesEverywhereDescription")}
          </TypographyMuted>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {edges.map((edge) => (
              <GameCard
                key={edge.node.id}
                game={edge.node}
                distance={edge.distance}
              />
            ))}
          </div>

          {/* Infinite scroll trigger */}
          <div
            ref={loadMoreRef}
            className="mt-8 flex h-10 items-center justify-center"
          >
            {isPending && (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
            )}
            {!pageInfo.hasNextPage && edges.length > 0 && (
              <TypographyMuted>
                {t("game.noGamesDescription")}
              </TypographyMuted>
            )}
          </div>
        </>
      )}
    </div>
  );
}
