"use client";

import { saveBasketballStats } from "@/app/[locale]/game/basketball-stats-actions";
import { UserAvatar } from "@/components/ui/user-avatar";
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
import type { UserRef } from "@/lib/types/game";
import type { BasketballStatsNode } from "@/lib/types/stats/basketball";
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
import { toast } from "@/components/ui/toast";
import { BasketballStatsForm } from "./basketball-stats-form";

const STICKY_FIRST_COL =
  "sticky left-0 z-10 bg-card group-hover/row:bg-muted/50 min-w-[140px]";

/** Stat keys that support leading-value highlighting */
const HIGHLIGHTABLE_STATS = [
  "points",
  "assists",
  "totalRebounds",
  "steals",
  "blocks",
] as const;

type HighlightableStat = (typeof HIGHLIGHTABLE_STATS)[number];

interface BasketballStatsTableProps {
  gameId: number;
  teamName: string;
  stats: { node: BasketballStatsNode }[];
  gameStatus: GameStatus;
  availableUsers?: UserRef[];
  viewerGameRole: GameRole | null;
}

/**
 * Compute the maximum value for each highlightable stat column.
 * Returns a map from stat key to the max value (or null if all values are null).
 */
function computeMaxStats(
  data: BasketballStatsNode[],
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

export function BasketballStatsTable({
  gameId,
  teamName,
  stats,
  gameStatus,
  availableUsers = [],
  viewerGameRole,
}: BasketballStatsTableProps) {
  const t = useTranslations("game.stats.basketball");
  const statsT = useTranslations("game.stats");
  const format = useFormatter();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "points", desc: true },
  ]);
  const [editingStats, setEditingStats] =
    useState<BasketballStatsNode | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const canEdit =
    viewerGameRole != null &&
    (gameStatus === GameStatus.IN_PROGRESS || gameStatus === GameStatus.COMPLETE);

  const existingUserIds = useMemo(
    () => new Set(stats.map((edge) => edge.node.user.id)),
    [stats],
  );

  const usersWithoutStats = useMemo(
    () => availableUsers.filter((p) => !existingUserIds.has(p.id)),
    [availableUsers, existingUserIds],
  );

  function handleAddStats() {
    if (!selectedUserId) return;
    startTransition(async () => {
      const result = await saveBasketballStats({
        userId: Number(selectedUserId),
        gameId,
      });
      if (result.success) {
        toast.add({ title: statsT("statsAddedForUser"), type: "success" });
        setSelectedUserId("");
      } else {
        toast.add({ title: result.message ?? statsT("statsErrorForUser"), type: "error" });
      }
    });
  }

  const data = useMemo(() => stats.map((edge) => edge.node), [stats]);

  const maxStats = useMemo(() => computeMaxStats(data), [data]);

  const columns: ColumnDef<BasketballStatsNode>[] = useMemo(() => {
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
    ): ColumnDef<BasketballStatsNode> {
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
      key: keyof BasketballStatsNode & string,
    ): ColumnDef<BasketballStatsNode> {
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
      madeKey: keyof BasketballStatsNode,
      attemptedKey: keyof BasketballStatsNode,
    ): ColumnDef<BasketballStatsNode> {
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

    function percentageColumn(
      key: keyof BasketballStatsNode & string,
    ): ColumnDef<BasketballStatsNode> {
      return {
        accessorKey: key,
        header: t(key),
        cell: ({ row }) => {
          const pct = row.original[key] as number | null;
          return (
            <span className="tabular-nums">
              {pct != null
                ? format.number(pct, {
                    style: "percent",
                    maximumFractionDigits: 1,
                  })
                : "-"}
            </span>
          );
        },
      };
    }

    return [
      {
        accessorKey: "user",
        header: "User",
        cell: ({ row }) => {
          const user = row.original.user;
          return (
            <div className="flex items-center gap-2">
              <UserAvatar user={user} size="sm" loading="lazy" />
              <span className="truncate">{user.displayName}</span>
            </div>
          );
        },
        enableSorting: false,
      },
      ...HIGHLIGHTABLE_STATS.map(highlightableStatColumn),
      plainStatColumn("turnovers"),
      plainStatColumn("personalFouls"),
      madeAttemptedColumn("fg", "fieldGoals", "fieldGoalsMade", "fieldGoalsAttempted"),
      percentageColumn("fieldGoalPercentage"),
      madeAttemptedColumn("3pt", "threePointers", "threePointersMade", "threePointersAttempted"),
      percentageColumn("threePointerPercentage"),
      madeAttemptedColumn("ft", "freeThrows", "freeThrowsMade", "freeThrowsAttempted"),
      percentageColumn("freeThrowPercentage"),
      ...(canEdit
        ? [
            {
              id: "actions",
              header: "",
              cell: ({
                row,
              }: {
                row: { original: BasketballStatsNode };
              }) => (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingStats(row.original)}
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

  const addStatsControls = canEdit && usersWithoutStats.length > 0 && (
    <div className="flex items-center gap-2">
      <Select
        value={selectedUserId || null}
        onValueChange={(val) => setSelectedUserId(val ?? "")}
        items={usersWithoutStats.map((p) => ({ value: String(p.id), label: p.displayName }))}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={statsT("selectUser")} />
        </SelectTrigger>
        <SelectContent>
          {usersWithoutStats.map((user) => (
            <SelectItem key={user.id} value={String(user.id)}>
              {user.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        onClick={handleAddStats}
        disabled={!selectedUserId || isPending}
      >
        {statsT("addStatsForUser")}
      </Button>
    </div>
  );

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{teamName}</CardTitle>
          {addStatsControls}
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
        {addStatsControls}
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

        {editingStats && (
          <BasketballStatsForm
            gameId={gameId}
            initialData={editingStats}
            open={true}
            onOpenChange={(open) => !open && setEditingStats(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
