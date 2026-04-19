"use client";

import { savePickleballStats } from "@/app/[locale]/game/pickleball-stats-actions";
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
import type { PickleballStatsNode } from "@/lib/types/stats/pickleball";
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
import { toast } from "sonner";
import { PickleballStatsForm } from "./pickleball-stats-form";

const STICKY_FIRST_COL =
  "sticky left-0 z-10 bg-card group-hover/row:bg-muted/50 min-w-[140px]";

const HIGHLIGHTABLE_STATS = [
  "pointsWon",
  "aces",
  "winners",
] as const;

type HighlightableStat = (typeof HIGHLIGHTABLE_STATS)[number];

interface PickleballStatsTableProps {
  gameId: number;
  teamName: string;
  stats: { node: PickleballStatsNode }[];
  gameStatus: GameStatus;
  availableUsers?: UserRef[];
  viewerGameRole: GameRole | null;
}

function computeMaxStats(
  data: PickleballStatsNode[],
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

export function PickleballStatsTable({
  gameId,
  teamName,
  stats,
  gameStatus,
  availableUsers = [],
  viewerGameRole,
}: PickleballStatsTableProps) {
  const t = useTranslations("game.stats.pickleball");
  const statsT = useTranslations("game.stats");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "pointsWon", desc: true },
  ]);
  const [editingStats, setEditingStats] =
    useState<PickleballStatsNode | null>(null);
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
      const result = await savePickleballStats({
        userId: Number(selectedUserId),
        gameId,
      });
      if (result.success) {
        toast.success(statsT("statsAddedForUser"));
        setSelectedUserId("");
      } else {
        toast.error(result.message ?? statsT("statsErrorForUser"));
      }
    });
  }

  const data = useMemo(() => stats.map((edge) => edge.node), [stats]);

  const maxStats = useMemo(() => computeMaxStats(data), [data]);

  const columns: ColumnDef<PickleballStatsNode>[] = useMemo(() => {
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
    ): ColumnDef<PickleballStatsNode> {
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
      key: keyof PickleballStatsNode & string,
    ): ColumnDef<PickleballStatsNode> {
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
      plainStatColumn("faults"),
      plainStatColumn("doubleFaults"),
      plainStatColumn("unforcedErrors"),
      plainStatColumn("forcedErrors"),
      plainStatColumn("dinks"),
      plainStatColumn("drives"),
      plainStatColumn("drops"),
      plainStatColumn("lobs"),
      plainStatColumn("volleys"),
      plainStatColumn("overheads"),
      ...(canEdit
        ? [
            {
              id: "actions",
              header: "",
              cell: ({
                row,
              }: {
                row: { original: PickleballStatsNode };
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
          <PickleballStatsForm
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
