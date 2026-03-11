"use client";

import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useTranslations } from "next-intl";
import AuthButton from "../auth/auth-button";
import { NotificationBell } from "../notification/notification-bell";
import { NavbarSearch } from "../search/navbar-search";
import { TypographyH1 } from "../ui/typography";

const CreateGameDialog = dynamic(
  () =>
    import("../game/create-game-dialog").then((m) => ({
      default: m.CreateGameDialog,
    })),
  { ssr: false },
);

export function Navbar() {
  const t = useTranslations();
  const { data: session } = useSession();

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
            <div className="hidden lg:block">
              <CreateGameDialog />
            </div>
          )}
          <NotificationBell />
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}
