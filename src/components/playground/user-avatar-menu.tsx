"use client";

import { getKeycloakLogoutUrl } from "@/components/auth/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface UserAvatarMenuProps {
  user: {
    username: string;
    name?: string | null;
    email?: string | null;
    profilePictureUrl?: string | null;
  };
  locale: string;
}

export function UserAvatarMenu({ user, locale }: UserAvatarMenuProps) {
  const t = useTranslations();

  // Generate initials from name or email
  const getInitials = (): string => {
    if (user.name) {
      const parts = user.name.split(" ");
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
      }
      return user.name.charAt(0).toUpperCase();
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const handleSignOut = async () => {
    const logoutUrl = await getKeycloakLogoutUrl();
    window.location.href = logoutUrl;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <Avatar className="h-9 w-9 cursor-pointer">
              <AvatarImage
                src={user.profilePictureUrl ?? undefined}
                alt={user.name ?? "User"}
              />
              <AvatarFallback>{getInitials()}</AvatarFallback>
            </Avatar>
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem>
          <Link
            href={`/${locale}/user/${user.username}`}
            className="flex items-center"
          >
            <User className="mr-2 h-4 w-4" />
            {t("profile.viewProfile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href={`/${locale}/settings`} className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            {t("profile.settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="flex items-center text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t("auth.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
