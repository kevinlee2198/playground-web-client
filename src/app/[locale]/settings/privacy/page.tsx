import {
  TypographyH2,
  TypographyMuted,
} from "@/components/ui/typography";
import { Separator } from "@/components/ui/separator";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type { BlockedUserEntry } from "../blocked/blocked-users-list";
import { BlockedUsersList } from "../blocked/blocked-users-list";
import { loadBlockedUsers, loadUserPreferences } from "../actions";
import { PrivacySettingsForm } from "./privacy-settings-form";

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

export default async function PrivacySettingsPage({ params }: PageProps) {
  const [{ locale }, t, preferences, blockedUsers] = await Promise.all([
    params,
    getTranslations("settings"),
    loadUserPreferences(),
    loadBlockedUsers(50),
  ]);

  if (!preferences) {
    redirect({ href: "/", locale });
  }

  // TypeScript does not infer that redirect() throws, so assert non-null here.
  if (!preferences) return null;

  const blockedEntries: BlockedUserEntry[] =
    (blockedUsers?.edges as BlockedUserEdge[] | undefined)?.map((edge) => ({
      userId: edge.node.id,
      displayName: edge.node.displayName,
      username: edge.node.username,
    })) ?? [];

  return (
    <div>
      <div className="mb-6">
        <TypographyH2>{t("privacy.title")}</TypographyH2>
        <TypographyMuted>{t("privacy.description")}</TypographyMuted>
      </div>

      <PrivacySettingsForm
        profileVisibility={preferences.profileVisibility}
        showOnlineStatus={preferences.showOnlineStatus}
        showGameHistory={preferences.showGameHistory}
        showStatistics={preferences.showStatistics}
      />

      <Separator className="my-6" />

      {/* Section 3: Blocked Users */}
      <div>
        <div className="mb-4">
          <TypographyH2>{t("privacy.blockedUsers")}</TypographyH2>
          <TypographyMuted>{t("blocked.description")}</TypographyMuted>
        </div>
        <BlockedUsersList entries={blockedEntries} />
      </div>
    </div>
  );
}
