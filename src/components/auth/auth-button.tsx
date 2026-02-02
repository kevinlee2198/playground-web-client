"use client";

import { Button } from "@/components/ui/button";
import { signIn, useSession } from "@/lib/auth-client";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { UserAvatarMenu } from "../playground/user-avatar-menu";
import { TypographyP } from "../ui/typography";
import { fetchCurrentUser } from "./actions";

export default function AuthButton() {
  const t = useTranslations();
  const locale = useLocale();
  const session = useSession();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    if (session?.data?.user) {
      fetchCurrentUser().then(setCurrentUser);
    }
  }, [session?.data?.user]);

  const handleSignIn = async () => {
    await signIn.oauth2({
      providerId: "keycloak",
      callbackURL: window.location.href,
    });
  };

  const handleSignUp = async () => {
    // Keycloak handles registration through the same OAuth flow
    // Users can click "Register" on the Keycloak login page
    await signIn.oauth2({
      providerId: "keycloak",
      callbackURL: window.location.href,
    });
  };

  if (session.isPending) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (session?.data?.user) {
    if (!currentUser) {
      return (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
        </div>
      );
    }

    return (
      <UserAvatarMenu
        user={{
          username: currentUser.username,
          name: `${currentUser.firstName} ${currentUser.lastName}`,
          email: currentUser.email,
        }}
        locale={locale}
      />
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" onClick={handleSignUp}>
        <TypographyP>{t("auth.signUp")}</TypographyP>
      </Button>
      <Button onClick={handleSignIn}>
        <TypographyP>{t("auth.signIn")}</TypographyP>
      </Button>
    </div>
  );
}
