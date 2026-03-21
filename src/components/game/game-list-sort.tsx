"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "@/i18n/navigation";
import { GameSortField, SortDirection } from "@/lib/constants";
import type { GameSortParams } from "@/lib/types/game";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

interface GameListSortProps {
  currentSort: GameSortParams;
  myGames: boolean;
  myGamesFilter?: string;
  hasLocation?: boolean;
}

export function GameListSort({
  currentSort,
  myGames,
  myGamesFilter,
  hasLocation = false,
}: GameListSortProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleMyGames = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "my") {
      params.set("myGames", "true");
    } else {
      params.delete("myGames");
      params.delete("myGamesFilter");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const updateMyGamesFilter = (filter: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === "all") {
      params.delete("myGamesFilter");
    } else {
      params.set("myGamesFilter", filter);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="mb-6 space-y-4">
      {/* My Games / All Games Toggle */}
      <Tabs value={myGames ? "my" : "all"} onValueChange={toggleMyGames}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="all">{t("game.allGames")}</TabsTrigger>
          <TabsTrigger value="my">{t("game.myGames")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* My Games Sub-Filters */}
      {myGames && (
        <div className="flex flex-wrap gap-2">
          {(["all", "managing", "invited"] as const).map((filter) => (
            <Button
              key={filter}
              variant={(!myGamesFilter && filter === "all") || myGamesFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => updateMyGamesFilter(filter)}
            >
              {t(`game.myGamesFilter.${filter}`)}
            </Button>
          ))}
        </div>
      )}

      {/* Sort Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px] space-y-2">
          <Label>{t("game.sort.title")}</Label>
          <Select
            value={currentSort.field}
            onValueChange={(value) => updateParam("sortField", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GameSortField.START_DATE}>
                {t("game.sort.startDate")}
              </SelectItem>
              <SelectItem value={GameSortField.GAME_STATUS}>
                {t("game.sort.gameStatus")}
              </SelectItem>
              {hasLocation && (
                <SelectItem value={GameSortField.DISTANCE}>
                  {t("game.sort.distance")}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Sort Direction Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            updateParam(
              "sortDir",
              currentSort.direction === SortDirection.ASC
                ? SortDirection.DESC
                : SortDirection.ASC,
            )
          }
          title={
            currentSort.direction === SortDirection.ASC
              ? t("game.sort.ascending")
              : t("game.sort.descending")
          }
        >
          {currentSort.direction === "ASC" ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
