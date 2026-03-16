"use client";

import { fetchCurrentUser } from "@/components/auth/actions";
import { Link, usePathname } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Gamepad2, Home, MessageCircle, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { TypographySmall } from "../ui/typography";
import { useScrollDirectionContext } from "./scroll-direction-provider";

function matchesRoute(pathname: string, route: string): boolean {
  if (route === "/") return pathname === "/" || pathname === "";
  return pathname === route || pathname.startsWith(route + "/");
}

interface TabItem {
  labelKey: string;
  href: string;
  icon: typeof Home;
}

const STATIC_TABS: TabItem[] = [
  { labelKey: "nav.feed", href: "/", icon: Home },
  { labelKey: "nav.games", href: "/games", icon: Gamepad2 },
  { labelKey: "nav.messages", href: "/chat", icon: MessageCircle },
];

export function TabBar(): ReactNode {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();
  const t = useTranslations();
  const { direction, isPullGestureActive } = useScrollDirectionContext();
  const [username, setUsername] = useState<string | null>(null);

  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      fetchCurrentUser().then((user) => {
        if (user) setUsername(user.username);
      });
    }
  }, [userId]);

  if (isPending || !session?.user) return null;

  const profileHref = username != null ? `/user/${username}` : "/";

  const tabs: TabItem[] = [
    ...STATIC_TABS,
    { labelKey: "nav.profile", href: profileHref, icon: User },
  ];

  // On mobile, hide when scrolling down (suppressed during pull-to-refresh)
  const isHidden = !isPullGestureActive && direction === "down";

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        // Mobile: fixed bottom bar
        "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-sm",
        "pb-[env(safe-area-inset-bottom)]",
        "transition-transform duration-250 ease-[cubic-bezier(0.25,0.1,0.25,1)] will-change-transform motion-reduce:transition-none",
        isHidden ? "translate-y-full" : "translate-y-0",
        // Desktop: static top bar below navbar
        "lg:static lg:z-auto lg:border-b lg:border-t-0 lg:bg-background lg:pb-0",
        "lg:translate-y-0 lg:backdrop-blur-none lg:will-change-auto",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center lg:gap-1 lg:px-6">
        {tabs.map((tab) => {
          const isActive = matchesRoute(pathname, tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.labelKey}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              onClick={(e) => {
                if (isActive) {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className={cn(
                // Mobile: vertical icon + label, equal-width grid
                "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-1.5",
                "touch-manipulation transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "active:scale-95 active:transition-transform active:duration-100",
                // Desktop: horizontal text tabs with bottom border
                "lg:inline-flex lg:flex-none lg:flex-row lg:items-center lg:gap-0",
                "lg:px-4 lg:py-2.5 lg:text-sm lg:font-medium",
                "lg:border-b-2 lg:-mb-px",
                // Active styles
                isActive
                  ? cn("text-primary", "lg:border-primary lg:text-primary")
                  : cn(
                      "text-muted-foreground",
                      "lg:border-transparent lg:text-muted-foreground",
                      "lg:hover:text-foreground lg:hover:border-border",
                    ),
              )}
            >
              {/* Mobile icon — hidden on desktop */}
              <Icon
                size={20}
                className="lg:hidden"
                fill={isActive ? "currentColor" : "none"}
                aria-hidden="true"
              />
              {/* Label — small on mobile, normal on desktop */}
              <TypographySmall
                className={cn(
                  "text-[10px] leading-tight lg:text-sm",
                  isActive && "font-semibold lg:font-medium",
                )}
              >
                {t(tab.labelKey)}
              </TypographySmall>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
