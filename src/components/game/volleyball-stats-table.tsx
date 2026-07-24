"use client";

import { saveVolleyballStats } from "@/app/[locale]/game/volleyball-stats-actions";
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
import type { VolleyballStatsNode } from "@/lib/types/stats/volleyball";
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
import { useTranslations } from "next-intl";
import { type ReactNode, useMemo, useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";
import { VolleyballStatsForm } from "./volleyball-stats-form";

const STICKY_FIRST_COL =
  "sticky left-0 z-10 bg-card group-hover/row:bg-muted/50 min-w-[140px]";

const HIGHLIGHTABLE_STATS = [
  "kills",
  "aces",
  "blocks",
  "digs",
  "assists",
  "points",
] as const;

type HighlightableStat = (typeof HIGHLIGHTABLE_STATS)[number];

interface VolleyballStatsTableProps {
  gameId: number;
  teamName: string;
  stats: { node: VolleyballStatsNode }[];
  gameStatus: GameStatus;
  availableUsers?: UserRef[];
  viewerGameRole: GameRole | null;
}

function computeMaxStats(
  data: VolleyballStatsNode[],
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

export function VolleyballStatsTable({
  gameId,
  teamName,
  stats,
  gameStatus,
  availableUsers = [],
  viewerGameRole,
}: VolleyballStatsTableProps) {
  const t = useTranslations("game.stats.volleyball");
  const statsT = useTranslations("game.stats");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "points", desc: true },
  ]);
  const [editingStats, setEditingStats] =
    useState<VolleyballStatsNode | null>(null);
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
      const result = await saveVolleyballStats({
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

  const columns: ColumnDef<VolleyballStatsNode>[] = useMemo(() => {
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
    ): ColumnDef<VolleyballStatsNode> {
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
      key: keyof VolleyballStatsNode & string,
    ): ColumnDef<VolleyballStatsNode> {
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

    return [
      {
        accessorKey: "user",
        header: statsT("user"),
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
      plainStatColumn("attackErrors"),
      plainStatColumn("attackAttempts"),
      {
        id: "hittingPercentage",
        header: t("hittingPercentage"),
        cell: ({ row }) => {
          const kills = row.original.kills;
          const errors = row.original.attackErrors;
          const attempts = row.original.attackAttempts;
          if (kills == null || errors == null || attempts == null || attempts === 0) {
            return <span className="tabular-nums">-</span>;
          }
          return (
            <span className="tabular-nums">
              {((kills - errors) / attempts).toFixed(3)}
            </span>
          );
        },
      },
      plainStatColumn("serviceErrors"),
      plainStatColumn("blockErrors"),
      plainStatColumn("receptionErrors"),
      ...(canEdit
        ? [
            {
              id: "actions",
              header: "",
              cell: ({
                row,
              }: {
                row: { original: VolleyballStatsNode };
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
  }, [t, statsT, canEdit, maxStats, data.length]);

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
          <VolleyballStatsForm
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
