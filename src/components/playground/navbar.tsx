"use client";

import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import AuthButton from "../auth/auth-button";
import { NotificationBell } from "../notification/notification-bell";
import { MobileSearchOverlay } from "../search/mobile-search-overlay";
import { NavbarSearch } from "../search/navbar-search";
import { Button } from "../ui/button";
import { buttonVariants } from "../ui/button-variants";
import { TypographyH1 } from "../ui/typography";
import { Search } from "lucide-react";

export function Navbar() {
  const t = useTranslations();
  const { data: session } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <nav className="w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
        {/* Logo + wordmark */}
        <Link href="/" className="mr-4 flex items-center gap-2">
          <Image
            src="/playground-logo.svg"
            width="30"
            height="30"
            alt="Playground Logo"
          />
          <TypographyH1 className="text-lg">{t("common.title")}</TypographyH1>
        </Link>

        {/* Search — desktop only */}
        <div className="mx-auto hidden lg:block">
          <NavbarSearch />
        </div>

        {/* Right zone */}
        <div className="ml-auto flex items-center gap-2">
          {/* New Game button — desktop only, auth only */}
          {session?.user && (
            <Link
              href="/game"
              className={buttonVariants({ variant: "default", className: "hidden lg:inline-flex" })}
            >
              {t("game.actions.create")}
            </Link>
          )}
          {/* Search icon button — mobile/tablet only */}
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11 lg:hidden"
            onClick={() => setSearchOpen(true)}
            aria-label={t("search.openSearch")}
          >
            <Search />
          </Button>
          <NotificationBell />
          <AuthButton />
        </div>
      </div>

      <MobileSearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
    </nav>
  );
}
