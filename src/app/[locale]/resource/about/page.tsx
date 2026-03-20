import { Card, CardContent } from "@/components/ui/card";
import {
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyLead,
  TypographyMuted,
  TypographyP,
} from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { BarChart3, Calendar, Camera, User, Users } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "About | Playground" };

const FEATURES = [
  { key: "organize", icon: Calendar },
  { key: "stats", icon: BarChart3 },
  { key: "friends", icon: Users },
  { key: "memories", icon: Camera },
] as const;

const TEAM_MEMBERS = [
  { key: "captain", accent: "border-t-orange-400", rotation: "-rotate-1" },
  { key: "commissioner", accent: "border-t-sky-400", rotation: "rotate-1" },
  { key: "benchwarmer", accent: "border-t-emerald-400", rotation: "-rotate-1" },
] as const;

export default async function AboutPage() {
  const t = await getTranslations("about");

  return (
    <main>
      {/* Hero */}
      <section className="relative bg-accent py-16 sm:py-24">
        <Image
          src="/playground-logo.svg"
          width={400}
          height={400}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 opacity-5 sm:right-16"
        />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <TypographyH1>{t("hero.title")}</TypographyH1>
          <TypographyLead className="mt-4">{t("hero.subtitle")}</TypographyLead>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <TypographyH2 className="mb-16 border-b-0 text-center">
          {t("features.title")}
        </TypographyH2>

        <div className="flex flex-col gap-16 sm:gap-24">
          {FEATURES.map(({ key, icon: Icon }, i) => (
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
                  <TypographyH3>{t(`features.${key}.title`)}</TypographyH3>
                </div>
                <TypographyP className="mt-0">
                  {t(`features.${key}.description`)}
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

      {/* Team */}
      <section className="bg-accent/50 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-6">
          <TypographyH2 className="mb-12 border-b-0 text-center">
            {t("team.title")}
          </TypographyH2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {TEAM_MEMBERS.map(({ key, accent, rotation }) => (
              <Card
                key={key}
                className={cn("border-t-4", accent, rotation)}
              >
                <CardContent className="flex flex-col items-center text-center">
                  <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-muted">
                    <User className="size-8 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <TypographyH3 className="text-xl">{t(`team.${key}.name`)}</TypographyH3>
                  <TypographyMuted>{t(`team.${key}.role`)}</TypographyMuted>
                  <TypographyP className="mt-2">
                    {t(`team.${key}.bio`)}
                  </TypographyP>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
