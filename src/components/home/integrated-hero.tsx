import { getTranslations } from "next-intl/server";
import { TypographyH1, TypographyLead } from "@/components/ui/typography";

interface IntegratedHeroProps {
  children: React.ReactNode;
}

export async function IntegratedHero({ children }: IntegratedHeroProps) {
  const t = await getTranslations("home.hero");

  return (
    <div>
      <div className="bg-gradient-to-b from-background to-card pb-2 pt-6 text-center">
        <TypographyH1 className="mb-2">{t("tagline")}</TypographyH1>
        <TypographyLead className="mx-auto max-w-lg">
          {t("description")}
        </TypographyLead>
      </div>
      {children}
    </div>
  );
}
