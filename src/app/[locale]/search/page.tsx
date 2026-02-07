import { searchUsers } from "@/components/search/actions";
import { SearchResultsList } from "@/components/search/search-results-list";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Search | Playground",
  description: "Search for users on Playground",
};

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const queryParams = await searchParams;
  const t = await getTranslations("search");

  const q = typeof queryParams.q === "string" ? queryParams.q.trim() : "";

  let initialResult = null;
  if (q) {
    initialResult = await searchUsers(q, 20);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">{t("title")}</h1>
      <SearchResultsList
        initialQuery={q}
        initialEdges={initialResult?.edges ?? null}
        initialPageInfo={initialResult?.pageInfo ?? null}
        initialError={
          initialResult?.success === false ? initialResult.error : null
        }
      />
    </main>
  );
}
