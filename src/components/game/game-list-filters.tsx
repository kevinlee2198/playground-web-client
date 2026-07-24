"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { GameStatus, SportType } from "@/lib/constants";
import type { GameFilterParams } from "@/lib/types/game";
import { cn, snakeToCamel } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

interface GameListFiltersProps {
  currentFilters: GameFilterParams;
}

export function GameListFilters({ currentFilters }: GameListFiltersProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    // Keep sort and myGames params, clear filter params
    const sortField = params.get("sortField");
    const sortDir = params.get("sortDir");
    const myGames = params.get("myGames");

    const newParams = new URLSearchParams();
    if (sortField) newParams.set("sortField", sortField);
    if (sortDir) newParams.set("sortDir", sortDir);
    if (myGames) newParams.set("myGames", myGames);

    router.push(`${pathname}?${newParams.toString()}`);
  };

  const hasActiveFilters =
    currentFilters.startAfter ||
    currentFilters.startBefore ||
    currentFilters.sportType ||
    currentFilters.gameStatus;

  const parseDate = (dateString: string | undefined) => {
    if (!dateString) return undefined;
    try {
      return new Date(dateString);
    } catch {
      return undefined;
    }
  };

  const startAfterDate = parseDate(currentFilters.startAfter);
  const startBeforeDate = parseDate(currentFilters.startBefore);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t("game.filters.title")}</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2"
          >
            <X className="mr-1 h-4 w-4" />
            {t("game.filters.clearFilters")}
          </Button>
        )}
      </div>

      {/* Sport Type Filter */}
      <div className="space-y-2">
        <Label>{t("game.filters.sportType")}</Label>
        <Select
          value={currentFilters.sportType ?? null}
          onValueChange={(value) =>
            updateFilter("sportType", value || undefined)
          }
          items={Object.keys(SportType).map((sport) => ({
            value: sport,
            label: t(`sports.${sport}`),
          }))}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("game.filters.allSports")} />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(SportType).map((sport) => (
              <SelectItem key={sport} value={sport}>
                {t(`sports.${sport}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Game Status Filter */}
      <div className="space-y-2">
        <Label>{t("game.filters.gameStatus")}</Label>
        <Select
          value={currentFilters.gameStatus ?? null}
          onValueChange={(value) =>
            updateFilter("gameStatus", value || undefined)
          }
          items={Object.values(GameStatus).map((status) => ({
            value: status,
            label: t(`game.status.${snakeToCamel(status.toLowerCase())}`),
          }))}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("game.filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            {Object.values(GameStatus).map((status) => (
              <SelectItem key={status} value={status}>
                {t(`game.status.${snakeToCamel(status.toLowerCase())}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Start Date Range Filter */}
      <div className="space-y-2">
        <Label>{t("game.filters.startDateRange")}</Label>

        {/* Start After */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t("game.filters.from")}
          </Label>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startAfterDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startAfterDate
                    ? format(startAfterDate, "PPP")
                    : t("game.form.selectDate")}
                </Button>
              }
            ></PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startAfterDate}
                onSelect={(date) =>
                  updateFilter("startAfter", date?.toISOString() || undefined)
                }
                autoFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Start Before */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t("game.filters.to")}
          </Label>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startBeforeDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startBeforeDate
                    ? format(startBeforeDate, "PPP")
                    : t("game.form.selectDate")}
                </Button>
              }
            ></PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startBeforeDate}
                onSelect={(date) =>
                  updateFilter("startBefore", date?.toISOString() || undefined)
                }
                autoFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
