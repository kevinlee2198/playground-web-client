"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Bell, Gamepad2, Lock, Monitor } from "lucide-react";
import { useTranslations } from "next-intl";

const navItems = [
  { key: "display", icon: Monitor, href: "/settings/display" },
  { key: "games", icon: Gamepad2, href: "/settings/games" },
  { key: "notifications", icon: Bell, href: "/settings/notifications" },
  { key: "privacy", icon: Lock, href: "/settings/privacy" },
] as const;

export function SettingsSidebarNav() {
  const t = useTranslations("settings.nav");
  const pathname = usePathname();

  return (
    <nav aria-label="Settings" className="flex flex-col gap-1">
      {navItems.map(({ key, icon: Icon, href }) => {
        const isActive = pathname.includes(href);
        return (
          <Link
            key={key}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
