import {
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyLead,
  TypographyP,
} from "@/components/ui/typography";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "FAQ | Playground" };

const FAQ_KEYS = [
  "free",
  "sports",
  "competitive",
  "strangers",
  "intramural",
  "data",
] as const;

export default async function FaqPage() {
  const t = await getTranslations("faq");

  return (
    <main>
      {/* Hero */}
      <section className="bg-accent py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <TypographyH1>{t("hero.title")}</TypographyH1>
          <TypographyLead className="mt-4">{t("hero.subtitle")}</TypographyLead>
        </div>
      </section>

      {/* Questions */}
      <section className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <TypographyH2 className="mb-12 border-b-0 text-center">
          {t("questions.title")}
        </TypographyH2>

        <div className="flex flex-col gap-10">
          {FAQ_KEYS.map((key) => (
            <div key={key} className="flex flex-col gap-2">
              <TypographyH3 className="text-xl">
                {t(`questions.${key}.question`)}
              </TypographyH3>
              <TypographyP className="mt-0">
                {t(`questions.${key}.answer`)}
              </TypographyP>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
