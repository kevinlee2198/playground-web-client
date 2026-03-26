import {
  TypographyH2,
  TypographyMuted,
} from "@/components/ui/typography";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { loadUserPreferences } from "../actions";
import { NotificationsSettingsForm } from "./notifications-settings-form";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function NotificationsSettingsPage({
  params,
}: PageProps) {
  const [{ locale }, t, preferences] = await Promise.all([
    params,
    getTranslations("settings.notifications"),
    loadUserPreferences(),
  ]);

  if (!preferences) {
    redirect({ href: "/", locale });
  }

  // TypeScript does not infer that redirect() throws, so assert non-null here.
  if (!preferences) return null;

  return (
    <div>
      <div className="mb-6">
        <TypographyH2>{t("title")}</TypographyH2>
        <TypographyMuted>{t("description")}</TypographyMuted>
      </div>
      <NotificationsSettingsForm
        notificationsEnabled={preferences.notificationsEnabled}
        emailDigestFrequency={preferences.emailDigestFrequency}
      />
    </div>
  );
}
