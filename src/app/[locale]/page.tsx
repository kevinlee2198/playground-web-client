import { loadFeedGames } from "@/app/[locale]/feed/actions";
import { ComponentExample } from "@/components/component-example";
import { ActivityFeed } from "@/components/feed/activity-feed";
import { CreateGameDialog } from "@/components/game/create-game-dialog";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { TypographyH1, TypographyP } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
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
        <CreateGameDialog />
      </div>

      {/* Feed content */}
      {feedData.edges.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("feed.empty.title")}</EmptyTitle>
            <EmptyDescription>{t("feed.empty.description")}</EmptyDescription>
          </EmptyHeader>
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
