"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import AuthButton from "../auth/auth-button";
import { NotificationBell } from "../notification/notification-bell";
import { NavbarSearch } from "../search/navbar-search";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../ui/navigation-menu";
import { TypographyH1 } from "../ui/typography";
import { NavbarAuthLinks } from "./navbar-auth-links";

export function Navbar() {
  const t = useTranslations();

  return (
    <nav className="w-full border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
        <Image
          src="/playground-logo.svg"
          width="30"
          height="30"
          alt="Playground
            Logo"
        />
        <Link href="/" className="mr-4 text-lg font-bold">
          <TypographyH1>{t("common.title")}</TypographyH1>
        </Link>

        <NavbarSearch />

        {/* Navigation */}
        <NavigationMenu className="ml-4">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Products</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4 md:grid-cols-2">
                  <li>
                    <NavItem
                      href="/products/analytics"
                      title="Analytics"
                      description="Track user behavior and metrics"
                    />
                  </li>
                  <li>
                    <NavItem
                      href="/products/automation"
                      title="Automation"
                      description="Automate workflows easily"
                    />
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink
                render={
                  <Link
                    href="/pricing"
                    className="px-4 py-2 text-sm font-medium hover:text-primary"
                  />
                }
              >
                Pricing
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink
                render={
                  <Link
                    href="/resource/contact"
                    className="px-4 py-2 text-sm font-medium hover:text-primary"
                  />
                }
              >
                Contact
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavbarAuthLinks />
          </NavigationMenuList>
        </NavigationMenu>
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}

function NavItem({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block space-y-1 rounded-md p-3 transition-colors hover:bg-muted"
    >
      <div className="text-sm font-medium">{title}</div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
