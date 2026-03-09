import { fetchCurrentUser } from "@/components/auth/actions";
import { TypographyH2, TypographyMuted } from "@/components/ui/typography";
import { redirect } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { loadBlockedUsers } from "../actions";
import { BlockedUsersList } from "./blocked-users-list";

export const metadata: Metadata = {
  title: "Blocked Users | Playground",
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function BlockedUsersPage({ params }: PageProps) {
  const { locale } = await params;

  const currentUser = await fetchCurrentUser();
  if (!currentUser) {
    redirect({ href: "/", locale });
  }

  const t = await getTranslations("settings.blocked");

  const blockedFriendships = await loadBlockedUsers(50);

  interface BlockedFriendshipEdge {
    node: {
      id: string;
      requester: { id: string; displayName: string };
      addressee: { id: string; displayName: string };
    };
  }

  // The current user is always the requester (blocker). The blocked user is the addressee.
  const entries: { friendshipId: string; userId: string; displayName: string }[] =
    (blockedFriendships?.edges as BlockedFriendshipEdge[] | undefined)?.map((edge) => ({
      friendshipId: edge.node.id,
      userId: edge.node.addressee.id,
      displayName: edge.node.addressee.displayName,
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
