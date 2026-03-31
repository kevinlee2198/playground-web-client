"use client";

import { saveTennisStatistics } from "@/app/[locale]/game/tennis-stats-actions";
import { PlayerAvatar } from "@/components/game/player-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GameStatus, type GameRole } from "@/lib/constants";
import type { PlayerRef } from "@/lib/types/game";
import type { TennisStatisticsNode } from "@/lib/types/stats/tennis";
import { cn } from "@/lib/utils";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Pencil } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { TennisStatsForm } from "./tennis-stats-form";

const STICKY_FIRST_COL =
  "sticky left-0 z-10 bg-card group-hover/row:bg-muted/50 min-w-[140px]";

const HIGHLIGHTABLE_STATS = [
  "aces",
  "totalPointsWon",
  "winners",
] as const;

type HighlightableStat = (typeof HIGHLIGHTABLE_STATS)[number];

interface TennisStatsTableProps {
  gameId: number;
  teamName: string;
  boxScores: { node: TennisStatisticsNode }[];
  gameStatus: GameStatus;
  availablePlayers?: PlayerRef[];
  viewerGameRole: GameRole | null;
}

function computeMaxStats(
  data: TennisStatisticsNode[],
): Record<HighlightableStat, number | null> {
  const result = {} as Record<HighlightableStat, number | null>;

  for (const stat of HIGHLIGHTABLE_STATS) {
    let max: number | null = null;
    for (const row of data) {
      const value = row[stat];
      if (value != null && (max === null || value > max)) {
        max = value;
      }
    }
    result[stat] = max;
  }

  return result;
}

export function TennisStatsTable({
  gameId,
  teamName,
  boxScores,
  gameStatus,
  availablePlayers = [],
  viewerGameRole,
}: TennisStatsTableProps) {
  const t = useTranslations("game.boxScore.tennis");
  const colT = useTranslations("game.boxScore.tennis.columns");
  const boxScoreT = useTranslations("game.boxScore");
  const format = useFormatter();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "totalPointsWon", desc: true },
  ]);
  const [editingStat, setEditingStat] =
    useState<TennisStatisticsNode | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const canEdit =
    viewerGameRole != null &&
    (gameStatus === GameStatus.IN_PROGRESS || gameStatus === GameStatus.COMPLETE);

  const existingPlayerIds = useMemo(
    () => new Set(boxScores.map((edge) => edge.node.player.id)),
    [boxScores],
  );

  const playersWithoutStats = useMemo(
    () => availablePlayers.filter((p) => !existingPlayerIds.has(p.id)),
    [availablePlayers, existingPlayerIds],
  );

  function handleAddPlayerStats() {
    if (!selectedPlayerId) return;
    startTransition(async () => {
      const result = await saveTennisStatistics({
        playerId: Number(selectedPlayerId),
        gameId,
      });
      if (result.success) {
        toast.success(boxScoreT("playerStatsAdded"));
        setSelectedPlayerId("");
      } else {
        toast.error(result.message ?? boxScoreT("playerStatsError"));
      }
    });
  }

  const data = useMemo(() => boxScores.map((edge) => edge.node), [boxScores]);

  const maxStats = useMemo(() => computeMaxStats(data), [data]);

  const columns: ColumnDef<TennisStatisticsNode>[] = useMemo(() => {
    function statCellClass(
      stat: HighlightableStat,
      value: number | null,
    ): string {
      if (
        data.length >= 2 &&
        value != null &&
        maxStats[stat] != null &&
        value === maxStats[stat]
      ) {
        return "text-primary font-semibold";
      }
      return "";
    }

    function sortableHeader(
      label: string,
      column: { toggleSorting: (asc: boolean) => void; getIsSorted: () => false | "asc" | "desc" },
    ): ReactNode {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          {label}
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      );
    }

    function highlightableStatColumn(
      stat: HighlightableStat,
    ): ColumnDef<TennisStatisticsNode> {
      return {
        accessorKey: stat,
        header: ({ column }) => sortableHeader(t(stat), column),
        cell: ({ row }) => {
          const value = row.original[stat];
          return (
            <span className={cn("tabular-nums", statCellClass(stat, value))}>
              {value ?? "-"}
            </span>
          );
        },
      };
    }

    function plainStatColumn(
      key: keyof TennisStatisticsNode & string,
    ): ColumnDef<TennisStatisticsNode> {
      return {
        accessorKey: key,
        header: t(key),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {(row.original[key] as number | null) ?? "-"}
          </span>
        ),
      };
    }

    function madeAttemptedColumn(
      headerKey: string,
      madeKey: keyof TennisStatisticsNode & string,
      attemptedKey: keyof TennisStatisticsNode & string,
    ): ColumnDef<TennisStatisticsNode> {
      return {
        id: headerKey,
        header: colT(headerKey),
        enableSorting: false,
        cell: ({ row }) => {
          const made = row.original[madeKey] as number | null;
          const attempted = row.original[attemptedKey] as number | null;
          if (made == null && attempted == null) {
            return <span className="tabular-nums">-</span>;
          }
          return (
            <span className="tabular-nums">
              {made ?? 0}/{attempted ?? 0}
            </span>
          );
        },
      };
    }

    function percentageColumn(
      id: string,
      headerKey: string,
      madeKey: keyof TennisStatisticsNode & string,
      attemptedKey: keyof TennisStatisticsNode & string,
    ): ColumnDef<TennisStatisticsNode> {
      return {
        id,
        header: colT(headerKey),
        enableSorting: false,
        cell: ({ row }) => {
          const made = row.original[madeKey] as number | null;
          const attempted = row.original[attemptedKey] as number | null;
          if (made == null || attempted == null || attempted === 0) {
            return <span className="tabular-nums">-</span>;
          }
          return (
            <span className="tabular-nums">
              {format.number(made / attempted, { style: "percent", maximumFractionDigits: 1 })}
            </span>
          );
        },
      };
    }

    return [
      {
        accessorKey: "player",
        header: boxScoreT("player"),
        cell: ({ row }) => {
          const player = row.original.player;
          return (
            <div className="flex items-center gap-2">
              <PlayerAvatar player={player} size="sm" loading="lazy" />
              <span className="truncate">{player.user.displayName}</span>
            </div>
          );
        },
        enableSorting: false,
      },
      // Serving
      highlightableStatColumn("aces"),
      plainStatColumn("doubleFaults"),
      madeAttemptedColumn("firstServeIn", "firstServesIn", "firstServeAttempts"),
      percentageColumn("firstServePercentage", "firstServePercentage", "firstServesIn", "firstServeAttempts"),
      madeAttemptedColumn("firstServePointsWon", "firstServePointsWon", "firstServePointsPlayed"),
      percentageColumn("firstServePointsWonPercentage", "firstServePointsWonPercentage", "firstServePointsWon", "firstServePointsPlayed"),
      madeAttemptedColumn("secondServePointsWon", "secondServePointsWon", "secondServePointsPlayed"),
      percentageColumn("secondServePointsWonPercentage", "secondServePointsWonPercentage", "secondServePointsWon", "secondServePointsPlayed"),
      // Returning
      madeAttemptedColumn("breakPointsConverted", "breakPointsConverted", "breakPointsFaced"),
      percentageColumn("breakPointsPercentage", "breakPointsPercentage", "breakPointsConverted", "breakPointsFaced"),
      madeAttemptedColumn("returnPointsWon", "returnPointsWon", "returnPointsPlayed"),
      percentageColumn("returnPointsWonPercentage", "returnPointsWonPercentage", "returnPointsWon", "returnPointsPlayed"),
      // General
      highlightableStatColumn("winners"),
      plainStatColumn("unforcedErrors"),
      highlightableStatColumn("totalPointsWon"),
      // Edit action
      ...(canEdit
        ? [
            {
              id: "actions",
              header: "",
              cell: ({
                row,
              }: {
                row: { original: TennisStatisticsNode };
              }) => (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingStat(row.original)}
                >
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
              ),
            },
          ]
        : []),
    ];
  }, [t, colT, boxScoreT, format, canEdit, maxStats, data.length]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  const addPlayerControls = canEdit && playersWithoutStats.length > 0 && (
    <div className="flex items-center gap-2">
      <Select
        value={selectedPlayerId || null}
        onValueChange={(val) => setSelectedPlayerId(val ?? "")}
        items={playersWithoutStats.map((p) => ({ value: String(p.id), label: p.user.displayName }))}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={boxScoreT("selectPlayer")} />
        </SelectTrigger>
        <SelectContent>
          {playersWithoutStats.map((player) => (
            <SelectItem key={player.id} value={String(player.id)}>
              {player.user.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        onClick={handleAddPlayerStats}
        disabled={!selectedPlayerId || isPending}
      >
        {boxScoreT("addPlayerStats")}
      </Button>
    </div>
  );

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{teamName}</CardTitle>
          {addPlayerControls}
        </CardHeader>
        <CardContent>
          <Empty className="border-none">
            <EmptyHeader>
              <EmptyDescription>{boxScoreT("noBoxScores")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{teamName}</CardTitle>
        {addPlayerControls}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        index === 0 && STICKY_FIRST_COL,
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="group/row">
                  {row.getVisibleCells().map((cell, index) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        index === 0 && STICKY_FIRST_COL,
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {editingStat && (
          <TennisStatsForm
            gameId={gameId}
            initialData={editingStat}
            open={true}
            onOpenChange={(open) => !open && setEditingStat(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
