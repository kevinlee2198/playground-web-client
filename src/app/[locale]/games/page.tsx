import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateGameDialog } from "@/components/game/create-game-dialog";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { GameStatusBadgeVariant } from "@/lib/constants";
import { authQuery } from "@/lib/graphql-request";
import type { GameStatus } from "@/lib/constants";
import type { GameNode } from "@/lib/types/game";

const gameStatusI18nKey: Record<GameStatus, string> = {
  SCHEDULED: "scheduled",
  IN_PROGRESS: "inProgress",
  COMPLETE: "complete",
};
import { redirect } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { EnumType } from "json-to-graphql-query";

export const metadata: Metadata = {
  title: "Games | Playground",
  description: "Browse and manage your games",
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function GamesPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations();

  // Auth check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect({ href: "/", locale });
  }

  // Check if user has a player profile
  const playerResponse = await authQuery({
    me: {
      id: true,
      player: {
        id: true,
        firstName: true,
        lastName: true,
      },
    },
  });

  const user = playerResponse.data?.me;
  const player = user?.player;

  // Show message if no player profile
  if (!player) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            {t("player.modal.title")}
          </h2>
          <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
            {t("player.modal.description")}
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link href="/player">{t("player.modal.create")}</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Fetch games
  const gamesResponse = await authQuery({
    games: {
      __args: {
        input: {},
        sort: [
          {
            field: new EnumType("START_DATE"),
            direction: new EnumType("DESC"),
          },
        ],
        first: 20,
      },
      edges: {
        cursor: true,
        node: {
          id: true,
          startDate: true,
          endDate: true,
          sportType: true,
          sportSubtype: true,
          gameStatus: true,
          participants: {
            __args: { first: 10 },
            edges: {
              node: {
                __on: [
                  {
                    __typeName: "TeamInstance",
                    id: true,
                    name: true,
                    players: { id: true, firstName: true, lastName: true },
                  },
                  {
                    __typeName: "IndividualParticipant",
                    id: true,
                    player: { id: true, firstName: true, lastName: true },
                  },
                ],
              },
            },
          },
        },
      },
      pageInfo: {
        hasNextPage: true,
        endCursor: true,
      },
    },
  });

  const games: GameNode[] = gamesResponse.data?.games?.edges?.map((edge: { node: GameNode }) => edge.node) || [];

  // Handle error state
  if (!gamesResponse.data?.games) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <p className="text-lg font-semibold text-destructive">
            {t("game.errors.loadError")}
          </p>
          <Button variant="outline" asChild className="mt-4">
            <Link href="/games">{t("game.errors.retry")}</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("game.title")}
        </h1>
        <CreateGameDialog />
      </div>

      {games.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">{t("game.noGames")}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("game.noGamesDescription")}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game: GameNode) => {
            const badgeVariant = GameStatusBadgeVariant[game.gameStatus];
            const statusText = t(`game.status.${gameStatusI18nKey[game.gameStatus]}`);
            const sportText = t(`sports.${game.sportType}`);
            const subtypeText = t(`sportSubtypes.${game.sportSubtype}`);
            const startDate = new Date(game.startDate).toLocaleDateString(
              locale,
              {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }
            );

            return (
              <Link
                key={game.id}
                href={`/game/${game.id}`}
                className="transition-transform hover:scale-[1.02]"
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">
                        {sportText} - {subtypeText}
                      </CardTitle>
                      <Badge variant={badgeVariant as "default" | "secondary" | "outline"}>
                        {statusText}
                      </Badge>
                    </div>
                    <CardDescription>{startDate}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {game.participants.edges.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          {t("game.participants.title")}
                        </p>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {game.participants.edges.slice(0, 3).map((edge) => {
                            const participant = edge.node;
                            if (participant.__typename === "TeamInstance") {
                              return (
                                <li key={participant.id}>
                                  {participant.name} ({participant.players.length}{" "}
                                  {t("game.participants.players").toLowerCase()})
                                </li>
                              );
                            } else {
                              const playerName = participant.player
                                ? `${participant.player.firstName} ${participant.player.lastName}`
                                : "Unknown Player";
                              return <li key={participant.id}>{playerName}</li>;
                            }
                          })}
                          {game.participants.edges.length > 3 && (
                            <li className="italic">
                              +{game.participants.edges.length - 3} more
                            </li>
                          )}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t("game.participants.noParticipants")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
