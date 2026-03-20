import { Card, CardContent } from "@/components/ui/card";
import {
  TypographyH1,
  TypographyLead,
  TypographyP,
} from "@/components/ui/typography";
import { Mail, Phone } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "Contact | Playground" };

export default async function ContactPage() {
  const t = await getTranslations("contact");

  return (
    <main>
      {/* Hero */}
      <section className="bg-accent py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <TypographyH1>{t("hero.title")}</TypographyH1>
          <TypographyLead className="mt-4">
            {t("hero.subtitle")}
          </TypographyLead>
        </div>
      </section>

      {/* Contact Card */}
      <div className="relative z-10 -mt-8 mx-auto max-w-lg px-6 pb-16 sm:pb-24">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Mail className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <TypographyP className="mt-0">
                <a href={`mailto:${t("email")}`} className="underline hover:text-primary">
                  {t("email")}
                </a>
              </TypographyP>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <TypographyP className="mt-0">{t("phone")}</TypographyP>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
