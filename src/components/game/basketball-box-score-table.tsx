"use client";

import { saveBasketballBoxScore } from "@/app/[locale]/game/box-score-actions";
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
import { GameStatus } from "@/lib/constants";
import type { GameRole } from "@/lib/constants";
import type { PlayerRef } from "@/lib/types/game";
import type { BasketballBoxScoreNode } from "@/lib/types/stats/basketball";
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
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { BasketballBoxScoreForm } from "./basketball-box-score-form";

interface BasketballBoxScoreTableProps {
  gameId: number;
  teamName: string;
  boxScores: { node: BasketballBoxScoreNode }[];
  gameStatus: GameStatus;
  availablePlayers?: PlayerRef[];
  viewerGameRole: GameRole | null;
}

export function BasketballBoxScoreTable({
  gameId,
  teamName,
  boxScores,
  gameStatus,
  availablePlayers = [],
  viewerGameRole,
}: BasketballBoxScoreTableProps) {
  const t = useTranslations("game.boxScore.basketball");
  const boxScoreT = useTranslations("game.boxScore");
  const format = useFormatter();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "points", desc: true },
  ]);
  const [editingScore, setEditingScore] =
    useState<BasketballBoxScoreNode | null>(null);
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
      const result = await saveBasketballBoxScore({
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

  const columns: ColumnDef<BasketballBoxScoreNode>[] = useMemo(
    () => [
      {
        accessorKey: "player",
        header: "Player",
        cell: ({ row }) => {
          const player = row.original.player;
          return `${player.firstName} ${player.lastName}`;
        },
        enableSorting: false,
      },
      {
        accessorKey: "points",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            {t("points")}
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => row.original.points ?? "-",
      },
      {
        accessorKey: "assists",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            {t("assists")}
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => row.original.assists ?? "-",
      },
      {
        accessorKey: "totalRebounds",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            {t("totalRebounds")}
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => row.original.totalRebounds ?? "-",
      },
      {
        accessorKey: "steals",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            {t("steals")}
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => row.original.steals ?? "-",
      },
      {
        accessorKey: "blocks",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            {t("blocks")}
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => row.original.blocks ?? "-",
      },
      {
        accessorKey: "turnovers",
        header: t("turnovers"),
        cell: ({ row }) => row.original.turnovers ?? "-",
      },
      {
        accessorKey: "personalFouls",
        header: t("personalFouls"),
        cell: ({ row }) => row.original.personalFouls ?? "-",
      },
      {
        id: "fg",
        header: t("fieldGoals"),
        cell: ({ row }) => {
          const made = row.original.fieldGoalsMade;
          const attempted = row.original.fieldGoalsAttempted;
          if (made == null && attempted == null) return "-";
          return `${made ?? 0}/${attempted ?? 0}`;
        },
      },
      {
        accessorKey: "fieldGoalPercentage",
        header: t("fieldGoalPercentage"),
        cell: ({ row }) => {
          const pct = row.original.fieldGoalPercentage;
          return pct != null
            ? format.number(pct, { style: "percent", maximumFractionDigits: 1 })
            : "-";
        },
      },
      {
        id: "3pt",
        header: t("threePointers"),
        cell: ({ row }) => {
          const made = row.original.threePointersMade;
          const attempted = row.original.threePointersAttempted;
          if (made == null && attempted == null) return "-";
          return `${made ?? 0}/${attempted ?? 0}`;
        },
      },
      {
        accessorKey: "threePointerPercentage",
        header: t("threePointerPercentage"),
        cell: ({ row }) => {
          const pct = row.original.threePointerPercentage;
          return pct != null
            ? format.number(pct, { style: "percent", maximumFractionDigits: 1 })
            : "-";
        },
      },
      {
        id: "ft",
        header: t("freeThrows"),
        cell: ({ row }) => {
          const made = row.original.freeThrowsMade;
          const attempted = row.original.freeThrowsAttempted;
          if (made == null && attempted == null) return "-";
          return `${made ?? 0}/${attempted ?? 0}`;
        },
      },
      {
        accessorKey: "freeThrowPercentage",
        header: t("freeThrowPercentage"),
        cell: ({ row }) => {
          const pct = row.original.freeThrowPercentage;
          return pct != null
            ? format.number(pct, { style: "percent", maximumFractionDigits: 1 })
            : "-";
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
                row: { original: BasketballBoxScoreNode };
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
    ],
    [t, format, canEdit],
  );

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
        value={selectedPlayerId}
        onValueChange={(val) => setSelectedPlayerId(val ?? "")}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={boxScoreT("selectPlayer")} />
        </SelectTrigger>
        <SelectContent>
          {playersWithoutStats.map((player) => (
            <SelectItem key={player.id} value={String(player.id)}>
              {player.firstName} {player.lastName}
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
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
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
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
          <BasketballBoxScoreForm
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
