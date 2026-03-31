"use client";

import { saveBaseballPitchingStats } from "@/app/[locale]/game/baseball-stats-actions";
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
import type { BaseballPitchingStatsNode } from "@/lib/types/stats/baseball";
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
import { BaseballPitchingStatsForm } from "./baseball-pitching-stats-form";

const STICKY_FIRST_COL =
  "sticky left-0 z-10 bg-card group-hover/row:bg-muted/50 min-w-[140px]";

/** Stat keys that support leading-value highlighting */
const HIGHLIGHTABLE_STATS = ["strikeouts", "inningsPitched"] as const;

type HighlightableStat = (typeof HIGHLIGHTABLE_STATS)[number];

interface BaseballPitchingStatsTableProps {
  gameId: number;
  teamName: string;
  boxScores: { node: BaseballPitchingStatsNode }[];
  gameStatus: GameStatus;
  availablePlayers?: PlayerRef[];
  viewerGameRole: GameRole | null;
}

/**
 * Compute the maximum value for each highlightable stat column.
 * Returns a map from stat key to the max value (or null if all values are null).
 */
function computeMaxStats(
  data: BaseballPitchingStatsNode[],
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

export function BaseballPitchingStatsTable({
  gameId,
  teamName,
  boxScores,
  gameStatus,
  availablePlayers = [],
  viewerGameRole,
}: BaseballPitchingStatsTableProps) {
  const t = useTranslations("game.boxScore.baseball.pitching");
  const boxScoreT = useTranslations("game.boxScore");
  const format = useFormatter();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "inningsPitched", desc: true },
  ]);
  const [editingScore, setEditingScore] =
    useState<BaseballPitchingStatsNode | null>(null);
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
      const result = await saveBaseballPitchingStats({
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

  const columns: ColumnDef<BaseballPitchingStatsNode>[] = useMemo(() => {
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
    ): ColumnDef<BaseballPitchingStatsNode> {
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
      key: keyof BaseballPitchingStatsNode & string,
    ): ColumnDef<BaseballPitchingStatsNode> {
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

    function booleanStatColumn(
      key: "win" | "loss" | "creditedSave",
    ): ColumnDef<BaseballPitchingStatsNode> {
      return {
        accessorKey: key,
        header: t(key),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original[key] === true ? "✓" : "-"}
          </span>
        ),
      };
    }

    return [
      {
        accessorKey: "player",
        header: "Player",
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
      ...HIGHLIGHTABLE_STATS.map(highlightableStatColumn),
      plainStatColumn("hitsAllowed"),
      plainStatColumn("runsAllowed"),
      plainStatColumn("earnedRuns"),
      plainStatColumn("walks"),
      plainStatColumn("homeRunsAllowed"),
      plainStatColumn("hitBatsmen"),
      plainStatColumn("wildPitches"),
      plainStatColumn("pitchCount"),
      booleanStatColumn("win"),
      booleanStatColumn("loss"),
      booleanStatColumn("creditedSave"),
      {
        accessorKey: "era",
        header: t("era"),
        cell: ({ row }) => {
          const val = row.original.era;
          return (
            <span className="tabular-nums">
              {val != null
                ? format.number(val, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "-"}
            </span>
          );
        },
      },
      ...(canEdit
        ? [
            {
              id: "actions",
              header: "",
              cell: ({
                row,
              }: {
                row: { original: BaseballPitchingStatsNode };
              }) => (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingScore(row.original)}
                >
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
              ),
            },
          ]
        : []),
    ];
  }, [t, format, canEdit, maxStats, data.length]);

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

        {editingScore && (
          <BaseballPitchingStatsForm
            gameId={gameId}
            initialData={editingScore}
            open={true}
            onOpenChange={(open) => !open && setEditingScore(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
