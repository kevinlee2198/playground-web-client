"use client";

import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import { NavigationMenuItem, NavigationMenuLink } from "../ui/navigation-menu";
import { TypographyP } from "../ui/typography";

export function NavbarAuthLinks() {
  const { data: session } = useSession();
  const t = useTranslations();

  if (!session?.user) return null;

  return (
    <>
      <NavigationMenuItem>
        <NavigationMenuLink
          render={
            <Link
              href="/games"
              className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary"
            />
          }
        >
          <TypographyP>{t("header.games")}</TypographyP>
        </NavigationMenuLink>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuLink
          render={
            <Link
              href="/player"
              className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary"
            />
          }
        >
          <TypographyP>{t("header.player")}</TypographyP>
        </NavigationMenuLink>
      </NavigationMenuItem>
    </>
  );
}
