import { TypographyH2, TypographyMuted } from "@/components/ui/typography";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { loadUserPreferences } from "../actions";
import { GamesSettingsForm } from "./games-settings-form";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function GamesSettingsPage({ params }: PageProps) {
  const [{ locale }, t, preferences] = await Promise.all([
    params,
    getTranslations("settings.games"),
    loadUserPreferences(),
  ]);

  if (!preferences) {
    redirect({ href: "/", locale });
    return; // redirect() throws, but TypeScript cannot infer that
  }

  return (
    <div>
      <div className="mb-6">
        <TypographyH2>{t("title")}</TypographyH2>
        <TypographyMuted>{t("description")}</TypographyMuted>
      </div>
      <GamesSettingsForm
        measurementUnit={preferences.measurementUnit}
        preferredSports={preferences.preferredSports}
      />
    </div>
  );
}
