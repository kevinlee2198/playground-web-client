import { loadFeedGames } from "@/app/[locale]/feed/actions";
import { ComponentExample } from "@/components/component-example";
import { ActivityFeed } from "@/components/feed/activity-feed";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { TypographyH1, TypographyP } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  // Unauthenticated: show current stub
  if (!session?.user) {
    return <ComponentExample />;
  }

  const t = await getTranslations();

  // Fetch initial feed data
  const feedData = await loadFeedGames(10);

  // Error state
  if (!feedData) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <TypographyP className="text-lg font-semibold text-destructive">
            {t("feed.error")}
          </TypographyP>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline" }), "mt-4")}
          >
            {t("feed.retry")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <TypographyH1 className="text-3xl">{t("feed.title")}</TypographyH1>
        <Link href="/game" className={buttonVariants()}>
          {t("game.actions.create")}
        </Link>
      </div>

      {/* Feed content */}
      {feedData.edges.length === 0 ? (
        <Empty>
          <EmptyHeader>
            {/* TODO: Replace with custom illustration */}
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle className="font-display font-semibold">
              {t("feed.empty.title")}
            </EmptyTitle>
            <EmptyDescription>{t("feed.empty.description")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              href="/games"
              className={cn(buttonVariants(), "w-full")}
            >
              {t("feed.empty.createGame")}
            </Link>
            <Link
              href="/search"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              {t("feed.empty.findFriends")}
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <ActivityFeed
          initialEdges={feedData.edges}
          initialPageInfo={feedData.pageInfo}
        />
      )}
    </main>
  );
}
