"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "@/i18n/navigation";
import { GameSortField } from "@/lib/constants";
import type { GameSortParams } from "@/lib/types/game";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

interface GameListSortProps {
  currentSort: GameSortParams;
  myGames: boolean;
}

export function GameListSort({ currentSort, myGames }: GameListSortProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleMyGames = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "my") {
      params.set("myGames", "true");
    } else {
      params.delete("myGames");
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
            </SelectContent>
          </Select>
        </div>

        {/* Sort Direction Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            updateParam("sortDir", currentSort.direction === "ASC" ? "DESC" : "ASC")
          }
          title={
            currentSort.direction === "ASC"
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
