"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

interface GamePageTabsProps {
  activeTab: string;
}

export function GamePageTabs({ activeTab }: GamePageTabsProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", value as string);
        // Preserve lat/lng/loc across tabs so location is restored on switch back
        if (value === "discover") {
          params.delete("myGames");
          params.delete("myGamesFilter");
        } else {
          params.delete("radius");
        }
        router.push(`${pathname}?${params.toString()}`);
      }}
    >
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="discover">{t("game.discover.title")}</TabsTrigger>
        <TabsTrigger value="my">{t("game.myGames")}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
