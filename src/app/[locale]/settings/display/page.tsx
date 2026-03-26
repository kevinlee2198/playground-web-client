import { TypographyH2, TypographyMuted } from "@/components/ui/typography";
import { getTranslations } from "next-intl/server";
import { DisplaySettingsForm } from "./display-settings-form";

export default async function DisplaySettingsPage() {
  const t = await getTranslations("settings.display");

  return (
    <div>
      <div className="mb-6">
        <TypographyH2>{t("title")}</TypographyH2>
        <TypographyMuted>{t("description")}</TypographyMuted>
      </div>
      <DisplaySettingsForm />
    </div>
  );
}
