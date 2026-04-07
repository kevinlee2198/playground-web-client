"use client";

import { saveFootballOffensiveStats } from "@/app/[locale]/game/football-stats-actions";
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
import type { FootballOffensiveStatsNode } from "@/lib/types/stats/football";
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
import { FootballOffensiveStatsForm } from "./football-offensive-stats-form";

const STICKY_FIRST_COL =
  "sticky left-0 z-10 bg-card group-hover/row:bg-muted/50 min-w-[140px]";

const HIGHLIGHTABLE_STATS = [
  "passingYards",
  "rushingYards",
  "receivingYards",
  "passingTouchdowns",
  "rushingTouchdowns",
  "receivingTouchdowns",
] as const;

type HighlightableStat = (typeof HIGHLIGHTABLE_STATS)[number];

interface FootballOffensiveStatsTableProps {
  gameId: number;
  teamName: string;
  stats: { node: FootballOffensiveStatsNode }[];
  gameStatus: GameStatus;
  availablePlayers?: PlayerRef[];
  viewerGameRole: GameRole | null;
}

function computeMaxStats(
  data: FootballOffensiveStatsNode[],
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

export function FootballOffensiveStatsTable({
  gameId,
  teamName,
  stats,
  gameStatus,
  availablePlayers = [],
  viewerGameRole,
}: FootballOffensiveStatsTableProps) {
  const t = useTranslations("game.stats.football.offensive");
  const statsT = useTranslations("game.stats");
  const format = useFormatter();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "passingYards", desc: true },
  ]);
  const [editingStat, setEditingStat] =
    useState<FootballOffensiveStatsNode | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const canEdit =
    viewerGameRole != null &&
    (gameStatus === GameStatus.IN_PROGRESS || gameStatus === GameStatus.COMPLETE);

  const existingPlayerIds = useMemo(
    () => new Set(stats.map((edge) => edge.node.player.id)),
    [stats],
  );

  const playersWithoutStats = useMemo(
    () => availablePlayers.filter((p) => !existingPlayerIds.has(p.id)),
    [availablePlayers, existingPlayerIds],
  );

  function handleAddPlayerStats() {
    if (!selectedPlayerId) return;
    startTransition(async () => {
      const result = await saveFootballOffensiveStats({
        playerId: Number(selectedPlayerId),
        gameId,
      });
      if (result.success) {
        toast.success(statsT("playerStatsAdded"));
        setSelectedPlayerId("");
      } else {
        toast.error(result.message ?? statsT("playerStatsError"));
      }
    });
  }

  const data = useMemo(() => stats.map((edge) => edge.node), [stats]);

  const maxStats = useMemo(() => computeMaxStats(data), [data]);

  const columns: ColumnDef<FootballOffensiveStatsNode>[] = useMemo(() => {
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
    ): ColumnDef<FootballOffensiveStatsNode> {
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
      key: keyof FootballOffensiveStatsNode & string,
    ): ColumnDef<FootballOffensiveStatsNode> {
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
      id: string,
      headerKey: string,
      madeKey: keyof FootballOffensiveStatsNode,
      attemptedKey: keyof FootballOffensiveStatsNode,
    ): ColumnDef<FootballOffensiveStatsNode> {
      return {
        id,
        header: t(headerKey),
        cell: ({ row }) => {
          const made = row.original[madeKey] as number | null;
          const attempted = row.original[attemptedKey] as number | null;
          if (made == null && attempted == null) {
            return <span className="tabular-nums">-</span>;
          }
          return (
            <span className="tabular-nums">
              {`${made ?? 0}/${attempted ?? 0}`}
            </span>
          );
        },
      };
    }

    return [
      {
        accessorKey: "player",
        header: statsT("player"),
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
      madeAttemptedColumn("cmpAtt", "completions", "completions", "passAttempts"),
      {
        id: "completionPercentage",
        header: t("completionPercentage"),
        cell: ({ row }) => {
          const comp = row.original.completions;
          const att = row.original.passAttempts;
          if (comp == null || att == null || att === 0) {
            return <span className="tabular-nums">-</span>;
          }
          return (
            <span className="tabular-nums">
              {format.number(comp / att, {
                style: "percent",
                maximumFractionDigits: 1,
              })}
            </span>
          );
        },
      },
      ...HIGHLIGHTABLE_STATS.map(highlightableStatColumn),
      plainStatColumn("interceptionsThrown"),
      plainStatColumn("sacksTaken"),
      plainStatColumn("sackYardsLost"),
      plainStatColumn("fumbles"),
      plainStatColumn("fumblesLost"),
      plainStatColumn("targets"),
      ...(canEdit
        ? [
            {
              id: "actions",
              header: "",
              cell: ({
                row,
              }: {
                row: { original: FootballOffensiveStatsNode };
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
  }, [t, statsT, format, canEdit, maxStats, data.length]);

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
          <SelectValue placeholder={statsT("selectPlayer")} />
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
        {statsT("addPlayerStats")}
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
              <EmptyDescription>{statsT("noStats")}</EmptyDescription>
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
                      className={cn(index === 0 && STICKY_FIRST_COL)}
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
                      className={cn(index === 0 && STICKY_FIRST_COL)}
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
          <FootballOffensiveStatsForm
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
