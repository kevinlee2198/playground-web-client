import { fetchCurrentUser } from "@/components/auth/actions";
import { TypographyH2, TypographyMuted } from "@/components/ui/typography";
import { redirect } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { loadBlockedUsers } from "../actions";
import type { BlockedUserEntry } from "./blocked-users-list";
import { BlockedUsersList } from "./blocked-users-list";

export const metadata: Metadata = {
  title: "Blocked Users | Playground",
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

interface BlockedUserEdge {
  node: {
    id: string;
    displayName: string;
    username: string;
  };
}

export default async function BlockedUsersPage({ params }: PageProps) {
  const { locale } = await params;

  const currentUser = await fetchCurrentUser();
  if (!currentUser) {
    redirect({ href: "/", locale });
  }

  const t = await getTranslations("settings.blocked");

  const blockedUsers = await loadBlockedUsers(50);

  const entries: BlockedUserEntry[] =
    (blockedUsers?.edges as BlockedUserEdge[] | undefined)?.map((edge) => ({
      userId: edge.node.id,
      displayName: edge.node.displayName,
      username: edge.node.username,
    })) ?? [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <TypographyH2>{t("title")}</TypographyH2>
        <TypographyMuted>{t("description")}</TypographyMuted>
      </div>

      <BlockedUsersList entries={entries} />
    </main>
  );
}
