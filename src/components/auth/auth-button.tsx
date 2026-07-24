"use client";

import { Button } from "@/components/ui/button";
import { signIn, signOut, useSession } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { UserAvatarMenu } from "../playground/user-avatar-menu";
import { Skeleton } from "../ui/skeleton";
import { TypographyP } from "../ui/typography";
import { fetchCurrentUser } from "./actions";

export default function AuthButton() {
  const t = useTranslations();
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
      fetchCurrentUser().then((result) => {
        switch (result.status) {
          case "authenticated":
            setCurrentUser(result.user);
            break;
          case "unauthenticated":
            signOut();
            break;
          case "error":
            break;
        }
      });
    }
  }, [session?.data?.user]);

  const handleSignIn = async () => {
    await signIn.oauth2({
      providerId: "keycloak",
      callbackURL: window.location.href,
    });
  };

  if (session.isPending) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    );
  }

  if (!session?.data?.user) {
    return (
      <Button onClick={handleSignIn}>
        <TypographyP as="span">{t("auth.signIn")}</TypographyP>
      </Button>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
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
    />
  );
}
