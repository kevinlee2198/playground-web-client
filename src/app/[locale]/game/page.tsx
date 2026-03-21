import { BackButton } from "@/components/game/back-button";
import { CreateGameForm } from "@/components/game/create-game-form";
import { TypographyH1 } from "@/components/ui/typography";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("game.createTitle") };
}

export default async function CreateGamePage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations();

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect({ href: "/", locale });
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <BackButton label={t("game.detail.backToGames")} />
      </div>
      <TypographyH1 className="mb-8">{t("game.createTitle")}</TypographyH1>
      <CreateGameForm />
    </main>
  );
}
