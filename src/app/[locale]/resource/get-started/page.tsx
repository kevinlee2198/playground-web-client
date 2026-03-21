import {
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyLead,
  TypographyP,
} from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import {
  Camera,
  ChartNoAxesCombined,
  Gamepad2,
  UserPlus,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "Getting Started | Playground" };

const STEPS = [
  { key: "signUp", icon: UserPlus },
  { key: "findFriends", icon: Users },
  { key: "createGame", icon: Gamepad2 },
  { key: "trackScores", icon: ChartNoAxesCombined },
  { key: "shareMemories", icon: Camera },
] as const;

export default async function GetStartedPage() {
  const t = await getTranslations("getStarted");

  return (
    <main>
      {/* Hero */}
      <section className="bg-accent py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <TypographyH1>{t("hero.title")}</TypographyH1>
          <TypographyLead className="mt-4">{t("hero.subtitle")}</TypographyLead>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <TypographyH2 className="mb-16 border-b-0 text-center">
          {t("steps.title")}
        </TypographyH2>

        <div className="flex flex-col gap-16 sm:gap-24">
          {STEPS.map(({ key, icon: Icon }, i) => (
            <div
              key={key}
              className={cn(
                "flex flex-col items-center gap-8 md:flex-row md:gap-12",
                i % 2 !== 0 && "md:flex-row-reverse",
              )}
            >
              <div className="flex flex-1 flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Icon className="size-7 shrink-0 text-primary" aria-hidden="true" />
                  <TypographyH3>{t(`steps.${key}.title`)}</TypographyH3>
                </div>
                <TypographyP className="mt-0">
                  {t(`steps.${key}.description`)}
                </TypographyP>
              </div>

              {/* Decorative accent block */}
              <div
                className="hidden aspect-[4/3] flex-1 rounded-2xl bg-muted md:block"
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
